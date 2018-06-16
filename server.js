
import express from 'express';
import expressLogging from 'express-logging';
import expressAsync from 'express-async-await';
import cors from 'cors';
import logger from 'logops';
import redis from 'redis';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import pifall from 'pifall';
import http from 'http';
import sha1 from 'sha1';

const ovi_config = {
  server_port: ( process.env.SERVER_PORT ? process.env.SERVER_PORT : 8080 ),
  wsbase: ( process.env.WSBASE ? process.env.WSBASE : 'http://localhost:8080' ),
  ip_header: ( process.env.CLIENT_IP_HEADER ? process.env.CLIENT_IP_HEADER : null ),
  redis_host: ( process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost' ),
  redis_port: ( process.env.REDIS_PORT ? process.env.REDIS_PORT : 6379 ),
  jwt_pub_key: ( process.env.JWS_PUB_KEY ? process.env.JWS_PUT_KEY : missingConfig("JWS_PUB_KEY") ),
  jwt_iss: ( process.env.JWS_ISS ? process.env.JWS_ISS : 'example.com' ),
  require_auth: ( process.env.AUTH_OPTIONAL ? false : true ),
  DEBUG: ( process.env.DEBUG ? true : false ),
};

// async'ify redis
pifall(redis.RedisClient.prototype);
pifall(redis.Multi.prototype);

// redis connection
var rc = redis.createClient(ovi_config.redis_port, ovi_config.redis_host,
  {
    // endlessly retry the database connection
    retry_strategy: function (options) {
      console.log('redis connection failed to "'+ovi_config.redis_host+'", retrying: this is attempt # '+options.attempt);
      return Math.min(options.attempt * 100, 3000);
    }
  }
);

rc.on('connect', async function() {
    console.log('Connected to redis at host "'+ovi_config.redis_host+'"');
});

function missingConfig(item) {
  let msg = "Missing config: "+item;
  console.log(msg);
  throw msg;
}

async function dbwrap() {
    var params = Array.prototype.slice.call(arguments);
    var func = params.shift();
    if (ovi_config.DEBUG) {
      let funcName = func.replace('Async', '');
      console.log('DEBUG: '+funcName+' '+params.join(' '));
    }
    return rc[func](params);
}

function cleanobj(obj) {
  for (var propName in obj) {
    if (obj[propName] == '' || obj[propName] == null)
      delete obj[propName];
  }
}

function getClientIP(req) {
  if (ovi_config.ip_header) return req.header(ovi_config.ip_header);
  else return req.connection.remoteAddress;
}

function wslog(req, ws, log) {
  log['user_id'] = req.user.id;
  log['client_ip'] = getClientIP(req);
  log['time'] = (new Date).getTime();
  let str = JSON.stringify(log);
  if (ovi_config.DEBUG) console.log('DEBUG: '+ws+': '+str);
  try {
    rc.lpush('wslog:'+ws, str);
  } catch (error) {
    console.log(error);
  }
}

async function poke(req, res) {
  try {
    var pong = await dbwrap('pingAsync', 'pong');
    if (pong == 'pong') return res.sendStatus(200);
  } catch (e) {
  }
  return res.sendStatus(500);
}

async function hello(req, res) {
  let msg = "Hello, world!";
  wslog(req, 'hello', {msg: msg});
  res.send({msg: msg});
}

// Initialize http server
const app = expressAsync(express());
app.disable('x-powered-by');
app.use(expressLogging(logger));
app.use(bodyParser.json());
app.use(cors());

// require ip_header if config for it is set
if (!ovi_config.DEBUG && ovi_config.ip_header) {
  app.use(function (req, res, next) {
    if (!req.header(ovi_config.ip_header)) {
      console.log('Connection without '+ovi_config.ip_header+' header');
      res.status(400).send();
    }
    else next();
  });
}

// add req.user if there's a valid JWT
app.use(function (req, res, next) {
  if (req.method == 'OPTIONS') return next(); // skip OPTIONS requests

  req.user = {};

  // uri whitelist
  if (req.url == '/poke') return next();

  if (ovi_config.require_auth && !req.header('authorization')) return res.status(401).send();

  try {
    let token = req.header('authorization').split(' ')[1];
    // TODO: verify with public key
    req.user = jwt.decode(token);
  } catch (e) {
    if (ovi_config.require_auth) {
      console.log(e);
      return res.status(401).send();
    }
  }
  next();
});

// internal routes
app.get('/poke', poke);

// ws routes
app.get('/canvass/v1/hello', hello);

// Launch the server
const server = app.listen(ovi_config.server_port, () => {
  const { address, port } = server.address();
  console.log('canvass-broker express');
  console.log(`Listening at http://${address}:${port}`);
});

