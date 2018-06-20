
import express from 'express';
import expressLogging from 'express-logging';
import expressAsync from 'express-async-await';
import cors from 'cors';
import fs from 'fs';
import logger from 'logops';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import http from 'http';
import sha1 from 'sha1';
import neo4j from 'neo4j-driver';
import BoltAdapter from 'node-neo4j-bolt-adapter';

const ovi_config = {
  server_port: ( process.env.SERVER_PORT ? process.env.SERVER_PORT : 8080 ),
  ip_header: ( process.env.CLIENT_IP_HEADER ? process.env.CLIENT_IP_HEADER : null ),
  neo4j_host: ( process.env.NEO4J_HOST ? process.env.NEO4J_HOST : 'localhost' ),
  neo4j_user: ( process.env.NEO4J_USER ? process.env.NEO4J_USER : 'neo4j' ),
  neo4j_pass: ( process.env.NEO4J_PASS ? process.env.NEO4J_PASS : 'neo4j' ),
  jwt_pub_key: ( process.env.JWT_PUB_KEY ? process.env.JWT_PUB_KEY : missingConfig("JWT_PUB_KEY") ),
  jwt_iss: ( process.env.JWT_ISS ? process.env.JWT_ISS : 'example.com' ),
  require_auth: ( process.env.AUTH_OPTIONAL ? false : true ),
  DEBUG: ( process.env.DEBUG ? true : false ),
};

var public_key = fs.readFileSync(ovi_config.jwt_pub_key);

// async'ify neo4j
const authToken = neo4j.auth.basic(ovi_config.neo4j_user, ovi_config.neo4j_pass);
const db = new BoltAdapter(neo4j.driver('bolt://'+ovi_config.neo4j_host, authToken));

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
      console.log('DEBUG: '+funcName+' '+params[0]+';'+(params[1]?' params: '+JSON.stringify(params[1]):''));
    }
    return db[func](params[0], params[1]);
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

async function poke(req, res) {
  try {
    let date = await dbwrap('cypherQueryAsync', 'return timestamp()');
    return res.sendStatus(200);
  } catch (e) {
    console.log(e);
  }
  return res.sendStatus(500);
}

async function hello(req, res) {
  let p;

  try {
    p = await dbwrap('cypherQueryAsync', 'match (n {name:{name}}) return n', {name:req.query.name});
  } catch(e) {
    console.warn(e);
  }

  res.send(p);
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
    req.user = jwt.verify(token, public_key);
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

