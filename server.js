
import express from 'express';
import expressLogging from 'express-logging';
import expressAsync from 'express-async-await';
import cors from 'cors';
import fs from 'fs';
import uuidv4 from 'uuid/v4';
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
  jwt_pub_key: ( process.env.JWT_PUB_KEY ? process.env.JWT_PUB_KEY : 'https://raw.githubusercontent.com/OurVoiceUSA/sm-oauth/master/public.key' ),
  jwt_iss: ( process.env.JWT_ISS ? process.env.JWT_ISS : 'example.com' ),
  require_auth: ( process.env.AUTH_OPTIONAL ? false : true ),
  DEBUG: ( process.env.DEBUG ? true : false ),
};

var public_key;

// if public key starts with http, use node-fetch
if (ovi_config.jwt_pub_key.match(/^http/)) {
  fetch(ovi_config.jwt_pub_key)
    .then(res => {
      if (res.status !== 200) throw "http code "+res.status;
      return res.text()
    })
    .then(body => {
      public_key = body;
    })
    .catch((e) => {
      console.log("Unable to read JWT_PUB_KEY of "+ovi_config.jwt_pub_key);
      console.log(e);
      process.exit(1);
    });
} else {
  public_key = fs.readFileSync(ovi_config.jwt_pub_key);
}

// async'ify neo4j
const authToken = neo4j.auth.basic(ovi_config.neo4j_user, ovi_config.neo4j_pass);
const db = new BoltAdapter(neo4j.driver('bolt://'+ovi_config.neo4j_host, authToken));

async function dbwrap() {
    var params = Array.prototype.slice.call(arguments);
    var func = params.shift();
    if (ovi_config.DEBUG) {
      let funcName = func.replace('Async', '');
      console.log('DEBUG: '+funcName+' '+params[0]+';'+(params[1]?' params: '+JSON.stringify(params[1]):''));
    }
    return db[func](params[0], params[1]);
}

async function cqa(q, p) {
  return dbwrap('cypherQueryAsync', q, p);
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

// just do a query and either return OK or ERROR

async function cqdo(req, res, q, p, a) {
  if (a === true && ovi_config.require_auth === true && req.user.admin !== true) return res.status(401).send();

  try {
    await cqa(q, p);
  } catch (e) {
    console.warn(e);
    return res.status(500).send();
  }

  return res.status(200).send();
}

function poke(req, res) {
  return cqdo(req, res, 'return timestamp()', false);
}

// they say that time's supposed to heal ya but i ain't done much healin'

async function hello(req, res) {
  let ref;
  let obj = {
    msg: "Awaiting assignment",
    ready: false,
    turf: [],
    teams: [],
    forms: [],
  };

  // Butterfly in the sky, I can go twice as high.
  if (req.user.admin === true) obj.admin = true;

  try {
    // direct assignment to a form
    ref = await cqa('match (a:Canvasser {id:{id}})-[:ASSIGNED]-(b:Form) return b', req.user)
    if (ref.data.length > 0) {
      obj.forms = obj.forms.concat(ref.data);
    }

    // direct assignment to turf
    ref = await cqa('match (a:Canvasser {id:{id}})-[:ASSIGNED]-(b:Turf) return b', req.user)
    if (ref.data.length > 0) {
      obj.turf = obj.turf.concat(ref.data);
    }

    // assingment to form/turf via team
    ref = await cqa('match (a:Canvasser {id:{id}})-[:MEMBERS]-(b:Team)-[:ASSIGNED]-(c:Turf) match (d:Form)-[:ASSIGNED]-(b) return collect(distinct(b)), collect(distinct(c)), collect(distinct(d))', req.user);
    if (ref.data[0][0].length > 0) {
      obj.teams = obj.teams.concat(ref.data[0][0]);
      obj.turf = obj.turf.concat(ref.data[0][1]);
      obj.forms = obj.forms.concat(ref.data[0][2]);
    }
  } catch (e) {
    console.warn(e);
    return res.status(500).send();
  }

  // TODO: dedupe, someone can be assigned directly to turf/forms and indirectly via a team
  // TODO: add questions to forms, like in formGet()

  if (obj.turf.length > 0 && obj.forms.length > 0) {
    obj.msg = "You are assigned turf and ready to canvass!";
    obj.ready = true;
  }

  return res.send(obj);
}

// canvassers

async function canvasserList(req, res) {
  let a = await cqa('match (a:Canvasser) return a');

  return res.send(a.data);
}

function canvasserLock(req, res) {
  if (req.query.id === req.user.id) return res.status(400).send({msg: "You can't lock yourself"});

  return cqdo(req, res, 'match (a:Canvasser {id:{id}}) set a.locked=true', req.query, true);
}

function canvasserUnlock(req, res) {
  return cqdo(req, res, 'match (a:Canvasser {id:{id}}) remove a.locked', req.query, true);
}

// teams

async function teamList(req, res) {
  let a = await cqa('match (a:Team) return a');

  return res.send(a.data);
}

function teamCreate(req, res) {
  return cqdo(req, res, 'create (a:Team {created: timestamp(), name:{name}})', req.query, true);
}

function teamDelete(req, res) {
  return cqdo(req, res, 'match (a:Team {name:{name}}) detach delete a', req.query, true);
}

async function teamMembersList(req, res) {
  let a = await cqa('match (a:Canvasser)-[:MEMBERS]-(b:Team {name:{teamName}}) return a', req.query);

  return res.send(a.data);
}

function teamMembersAdd(req, res) {
  return cqdo(req, res, 'match (a:Canvasser {id:{cId}}), (b:Team {name:{teamName}}) merge (b)-[:MEMBERS]->(a)', req.query, true);
}

function teamMembersRemove(req, res) {
  return cqdo(req, res, 'match (a:Canvasser {id:{cId}})-[r:MEMBERS]-(b:Team {name:{teamName}}) delete r', req.query, true);
}

// turf

async function turfList(req, res) {
  let a = await cqa('match (a:Turf) return a');

  return res.send(a.data);
}

function turfCreate(req, res) {
  return cqdo(req, res, 'create (a:Turf {created: timestamp(), name:{name}})', req.query, true);
}

function turfDelete(req, res) {
  return cqdo(req, res, 'match (a:Turf {name:{name}}) detach delete a', req.query, true);
}

async function turfAssignedList(req, res) {
  let a = await cqa('match (a:Turf {name:{turfName}})-[:ASSIGNED]-(b:Team) return b', req.query);

  return res.send(a.data);
}

function turfAssignedAdd(req, res) {
  return cqdo(req, res, 'match (a:Turf {name:{turfName}}), (b:Team {name:{teamName}}) merge (a)-[:ASSIGNED]->(b)', req.query, true);
}

function turfAssignedRemove(req, res) {
  return cqdo(req, res, 'match (a:Turf {name:{turfName}})-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.query, true);
}

// form

async function formGet(req, res) {
  let form = {};

  let a = await cqa('match (a:Form {id:{id}})-[:AUTHOR]-(b:Canvasser) return a,b', req.query);

  if (a.data.length === 1) {
    form = a.data[0][0];
    form.author_id = a.data[0][1].id;
    form.author = a.data[0][1].name;
    let b = await cqa('match (a:Question)-[:ASSIGNED]-(b:Form {id:{id}}) return a', req.query);
    form.questions = b.data;
  }

  return res.send(form);
}

async function formList(req, res) {
  let a = await cqa('match (a:Form) return a');

  return res.send(a.data);
}

async function formCreate(req, res) {
   req.query.id = uuidv4();
   req.query.author_id = req.user.id;
   try {
     await cqa('match (a:Canvasser {id:{author_id}}) create (b:Form {created: timestamp(), id:{id}, name:{name}, version:1})-[:AUTHOR]->(a)', req.query);
   } catch (e) {
     console.log(e);
     return res.status(500).send();
   }
   return res.send({id:req.query.id});
}

function formDelete(req, res) {
  return cqdo(req, res, 'match (a:Form {id:{id}}) detach delete a', req.query, true);
}

async function formAssignedList(req, res) {
  let a = await cqa('match (a:Form {id:{fId}})-[:ASSIGNED]-(b:Team) return b', req.query);

  return res.send(a.data);
}

function formAssignedAdd(req, res) {
  return cqdo(req, res, 'match (a:Form {id:{fId}}), (b:Team {name:{teamName}}) merge (a)-[:ASSIGNED]->(b)', req.query, true);
}

function formAssignedRemove(req, res) {
  return cqdo(req, res, 'match (a:Form {id:{fId}})-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.query, true);
}

// question

async function questionGet(req, res) {
  let q = {};

  let a = await cqa('match (a:Question {key:{key}})-[:AUTHOR]-(b:Canvasser) return a,b', req.query);

  if (a.data.length === 1) {
    q = a.data[0][0];
    q.author_id = a.data[0][1].id;
    q.author = a.data[0][1].name;
  }

  return res.send(q);
}

async function questionList(req, res) {
  let a = await cqa('match (a:Question) return a');

  return res.send(a.data);
}

function questionCreate(req, res) {
   req.query.author_id = req.user.id;
   return cqdo(req, res, 'match (a:Canvasser {id:{author_id}}) create (b:Question {created: timestamp(), key:{key}, label:{label}, type:{type}})-[:AUTHOR]->(a)', req.query);
}

function questionDelete(req, res) {
  return cqdo(req, res, 'match (a:Question {key:{key}}) detach delete a', req.query, true);
}

async function questionAssignedList(req, res) {
  let a = await cqa('match (a:Question {key:{key}})-[:ASSIGNED]-(b:Form) return b', req.query);

  return res.send(a.data);
}

function questionAssignedAdd(req, res) {
  return cqdo(req, res, 'match (a:Question {key:{key}}), (b:Form {id:{fId}}) merge (a)-[:ASSIGNED]->(b)', req.query, true);
}

function questionAssignedRemove(req, res) {
  return cqdo(req, res, 'match (a:Question {key:{key}})-[r:ASSIGNED]-(b:Form {id:{fId}}) delete r', req.query, true);
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
app.use(async function (req, res, next) {
  if (req.method == 'OPTIONS') return next(); // skip OPTIONS requests

  req.user = {};

  // uri whitelist
  if (req.url == '/poke') return next();

  try {
    let u;
    if (ovi_config.require_auth) {
      if (!req.header('authorization')) return res.status(401).send();
      u = jwt.verify(req.header('authorization').split(' ')[1]);
    } else {
      let token;
      if (req.header('authorization')) token = req.header('authorization').split(' ')[1];
      else token = req.query.jwt;
      u = jwt.decode(token);
    }

    // verify props
    if (!u.id) return res.status(401).send();

    // check for this user in the database
    let a = await cqa('match (a:Canvasser {id:{id}}) return a', u);
    if (a.data.length === 1) {
      req.user = a.data[0];
      // TODO: check req.user vs. u to update name or email or avatar props
    } else {
      // attempt to create the user, some props are optional
      if (!u.email) u.email = "";
      if (!u.avatar) u.avatar = "";
      await cqa('create (a:Canvasser {created: timestamp(), id:{id}, name:{name}, email:{email}, avatar:{avatar}})', u);
      a = await cqa('match (a:Canvasser {id:{id}}) return a', u);
      req.user = a.data[0];
    }

    if (req.user.locked) return res.status(403).send();

  } catch (e) {
    console.warn(e);
    return res.status(401).send();
  }
  next();
});

// internal routes
app.get('/poke', poke);

// ws routes
app.get('/canvass/v1/hello', hello);
app.get('/canvass/v1/canvasser/list', canvasserList);
app.get('/canvass/v1/canvasser/lock', canvasserLock);
app.get('/canvass/v1/canvasser/unlock', canvasserUnlock);
app.get('/canvass/v1/team/list', teamList);
app.get('/canvass/v1/team/create', teamCreate);
app.get('/canvass/v1/team/delete', teamDelete);
app.get('/canvass/v1/team/members/list', teamMembersList);
app.get('/canvass/v1/team/members/add', teamMembersAdd);
app.get('/canvass/v1/team/members/remove', teamMembersRemove);
app.get('/canvass/v1/turf/list', turfList);
app.get('/canvass/v1/turf/create', turfCreate);
app.get('/canvass/v1/turf/delete', turfDelete);
app.get('/canvass/v1/turf/assigned/list', turfAssignedList);
app.get('/canvass/v1/turf/assigned/add', turfAssignedAdd);
app.get('/canvass/v1/turf/assigned/remove', turfAssignedRemove);
app.get('/canvass/v1/form/get', formGet);
app.get('/canvass/v1/form/list', formList);
app.get('/canvass/v1/form/create', formCreate);
app.get('/canvass/v1/form/delete', formDelete);
app.get('/canvass/v1/form/assigned/list', formAssignedList);
app.get('/canvass/v1/form/assigned/add', formAssignedAdd);
app.get('/canvass/v1/form/assigned/remove', formAssignedRemove);
app.get('/canvass/v1/question/get', questionGet);
app.get('/canvass/v1/question/list', questionList);
app.get('/canvass/v1/question/create', questionCreate);
app.get('/canvass/v1/question/delete', questionDelete);
app.get('/canvass/v1/question/assigned/list', questionAssignedList);
app.get('/canvass/v1/question/assigned/add', questionAssignedAdd);
app.get('/canvass/v1/question/assigned/remove', questionAssignedRemove);

// Launch the server
const server = app.listen(ovi_config.server_port, () => {
  const { address, port } = server.address();
  console.log('canvass-broker express');
  console.log(`Listening at http://${address}:${port}`);
});

