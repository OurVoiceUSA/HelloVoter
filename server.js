
import express from 'express';
import expressLogging from 'express-logging';
import expressAsync from 'express-async-await';
import cors from 'cors';
import uuidv4 from 'uuid/v4';
import logger from 'logops';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import http from 'http';
import fs from 'fs';
import pip from 'point-in-polygon';
import neo4j from 'neo4j-driver';
import BoltAdapter from 'node-neo4j-bolt-adapter';
import * as secrets from "docker-secrets-nodejs";

const ovi_config = {
  server_port: getConfig("server_port", false, 8080),
  ip_header: getConfig("client_ip_header", false, null),
  neo4j_host: getConfig("neo4j_host", false, 'localhost'),
  neo4j_user: getConfig("neo4j_user", false, 'neo4j'),
  neo4j_pass: getConfig("neo4j_pass", false, 'neo4j'),
  jwt_pub_key: getConfig("jwt_pub_key", false, null),
  sm_oauth: getConfig("sm_oauth_url", false, 'https://ws.ourvoiceusa.org/auth'),
  DEBUG: getConfig("debug", false, false),
};

var public_key;
var jwt_iss = 'ourvoiceusa.org';

if (ovi_config.jwt_pub_key) {
  public_key = fs.readFileSync(ovi_config.jwt_pub_key);
} else {
  console.log("JWT_PUB_KEY not defined, attempting to fetch from "+ovi_config.sm_oauth+'/pubkey');
  fetch(ovi_config.sm_oauth+'/pubkey')
  .then(res => {
    jwt_iss = res.headers.get('x-jwt-iss');
    if (res.status !== 200) throw "http code "+res.status;
    return res.text()
  })
  .then(body => {
    public_key = body;
  })
  .catch((e) => {
    console.log("Unable to read SM_OAUTH_URL "+ovi_config.sm_oauth);
    console.log(e);
    process.exit(1);
  });
}

// async'ify neo4j
const authToken = neo4j.auth.basic(ovi_config.neo4j_user, ovi_config.neo4j_pass);
const db = new BoltAdapter(neo4j.driver('bolt://'+ovi_config.neo4j_host, authToken));

cqa('return timestamp()').catch((e) => {console.error("Unable to connect to database."); process.exit(1)}).then(() => {
  cqa('create constraint on (a:Canvasser) assert a.id is unique');
  cqa('create constraint on (a:Team) assert a.name is unique');
  cqa('create constraint on (a:Turf) assert a.name is unique');
  cqa('create constraint on (a:Form) assert a.id is unique');
  cqa('create constraint on (a:Question) assert a.key is unique');
  cqa('create constraint on (a:Address) assert a.id is unique');
  cqa('create constraint on (a:Unit) assert a.id is unique');
  cqa('create constraint on (a:Survey) assert a.id is unique');
});

function getConfig(item, required, def) {
  let value = secrets.get(item);
  if (!value) {
    if (required) {
      let msg = "Missing config: "+item.toUpperCase();
      console.log(msg);
      throw msg;
    } else {
      return def;
    }
  }
  return value;
}

// TODO: safe input for generic safety vs. valid input on a data type basis

function safe_input(str) {
  switch (typeof str) {
    case 'object': return true;
    case 'number': return true;
    case 'boolean': return true;
    case 'string': if (str.match(/^[0-9a-zA-Z:_\?\-\/\. '"]+$/)) return true;
  }
  return false;
}

function valid(str) {
  if (!str) return false;
  return true;
}

async function dbwrap() {
    var params = Array.prototype.slice.call(arguments);
    var func = params.shift();
    if (ovi_config.DEBUG) {
      let funcName = func.replace('Async', '');
      console.log('DEBUG: '+funcName+' '+params[0]+';');
      console.log('DEBUG: :params '+JSON.stringify(params[1]));
    }
    return db[func](params[0], params[1]);
}

async function cqa(q, p) {
  return dbwrap('cypherQueryAsync', q, p);
}

function getClientIP(req) {
  if (ovi_config.ip_header) return req.header(ovi_config.ip_header);
  else return req.connection.remoteAddress;
}

// just do a query and either return OK or ERROR

async function cqdo(req, res, q, p, a) {
  if (a === true && req.user.admin !== true)
    return res.status(403).json({error: true, msg: "Permission denied."});

  let ref;

  try {
    ref = await cqa(q, p);
  } catch (e) {
    console.warn(e);
    return res.status(500).json({error: true, msg: "Internal server error."});
  }

  return res.status(200).json({msg: "OK", data: ref.data});
}

function idInArrObj (arr, id) {
  for (let i in arr)
    if (arr[i].id === id) return true;
  return false;
}

function pipNode(node, geom) {
  switch (geom.type) {
    case "Polygon":
      if (pip([node.longitude, node.latitude], geom.coordinates[0])) {
        return true;
      }
      break;
    case "MultiPolygon":
      for (let p in geom.coordinates) {
        if (pip([node.longitude, node.latitude], geom.coordinates[p][0])) {
          return true;
        }
      }
      break;
  }
  return false;
}

async function sameTeam(ida, idb) {
  if (ida === idb) return true;

  try {
    let ref = await cqa('match (a:Canvasser {id:{ida}})-[:MEMBERS]-(c:Team)-[:MEMBERS]-(b:Canvasser {id:{idb}}) return c;', {ida: ida, idb: idb});
    if (ref.data.length > 0)
      return true;
  } catch (e) {
    console.warn(e);
  }

  return false;
}

async function canvassAssignments(id) {
  let ref;
  let obj = {
    ready: false,
    turf: [],
    teams: [],
    forms: [],
  };

  try {
    // direct assignment to a form
    ref = await cqa('match (a:Canvasser {id:{id}})-[:ASSIGNED]-(b:Form) return b', {id: id});
    if (ref.data.length > 0) {
      obj.forms = obj.forms.concat(ref.data);
    }

    // direct assignment to turf
    ref = await cqa('match (a:Canvasser {id:{id}})-[:ASSIGNED]-(b:Turf) return b', {id: id});
    if (ref.data.length > 0) {
      obj.turf = obj.turf.concat(ref.data);
    }

    // assingment to form/turf via team
    ref = await cqa('match (a:Canvasser {id:{id}})-[:MEMBERS]-(b:Team)-[:ASSIGNED]-(c:Turf) match (d:Form)-[:ASSIGNED]-(b) return collect(distinct(b)), collect(distinct(c)), collect(distinct(d))', {id: id});
    if (ref.data[0][0].length > 0) {
      obj.teams = obj.teams.concat(ref.data[0][0]);
      obj.turf = obj.turf.concat(ref.data[0][1]);
      obj.forms = obj.forms.concat(ref.data[0][2]);
    }
  } catch (e) {
    console.warn(e);
  }

  // TODO: dedupe, someone can be assigned directly to turf/forms and indirectly via a team
  // TODO: add questions to forms, like in formGet()

  if (obj.turf.length > 0 && obj.forms.length > 0)
    obj.ready = true;

  return obj;
}

// API function calls

function poke(req, res) {
  return cqdo(req, res, 'return timestamp()', false);
}

// they say that time's supposed to heal ya but i ain't done much healin'

async function hello(req, res) {
  let lng = req.body.longitude;
  let lat = req.body.latitude;

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) res.status(400).json({error: true, msg: "Parameters longitude and latitude must be set and numeric."});

  let msg = "Awaiting assignment";
  let ass = await canvassAssignments(req.user.id);

  try {
    // if there are no admins, make this one an admin
    let ref = await cqa('match (a:Canvasser {admin:true}) return count(a)');
    if (ref.data[0] === 0) {
      await cqa('match (a:Canvasser {id:{id}}) set a.admin=true', req.user);
      req.user.admin = true;
    }

    // Butterfly in the sky, I can go twice as high.
    if (req.user.admin === true) ass.admin = true;

    await cqa('match (a:Canvasser {id:{id}}) set a.longitude={lng}, a.latitude={lat}', {id: req.user.id, lng: lng, lat: lat});
  } catch (e) {
    console.warn(e);
    return res.status(500).json({error: true, msg: "Internal server error."});
  }

  if (ass.ready)
    msg = "You are assigned turf and ready to canvass!";

  return res.json({msg: msg, data: ass});
}

function uncle(req, res) {
  return res.json({name: "Bob"});
}

// canvassers

function canvasserList(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Canvasser) return a');
  else
    return cqdo(req, res, 'match (a:Canvasser {id:{id}})-[:ASSIGNED]-(b:Team)-[:ASSIGNED]-(c:Canvasser) return c', req.user);
}

async function canvasserGet(req, res) {
  if (!req.user.admin && req.query.id !== req.user.id && !await sameTeam(req.query.id, req.user.id)) return res.status(403).json({error: true, msg: "Permission denied."});

  return cqdo(req, res, 'match (a:Canvasser {id:{id}}) return a', req.query);
}

function canvasserUpdate(req, res) {
  if (!req.user.admin && req.body.id !== req.user.id) return res.status(403).json({error: true, msg: "Permission denied."});
  // TODO: need looser valid function for avatar
  if (!valid(req.body.name) || !valid(req.body.id)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'id' or 'name' or 'avatar'."});

  return cqdo(req, res, 'match (a:Canvasser {id:{id}}) set a.display_name={name}, a.display_avatar={avatar}', req.body);
}

async function canvasserUnassigned(req, res) {
  return cqdo(req, res, 'match (a:Canvasser) where a.locked is null and not (a)-[:MEMBERS]-(:Team) and not (a)-[:ASSIGNED]-(:Turf) return a', {}, true);
}

async function canvasserLock(req, res) {
  if (req.body.id === req.user.id) return res.status(403).json({error: true, msg: "You can't lock yourself."});

  try {
    let ref = await cqa("match (a:Canvasser {id:{id}}) return a", req.body);
    if (ref.data[0] && ref.data[0].admin === true)
      return res.status(403).json({error: true, msg: "Permission denied."});
  } catch(e) {
    console.warn(e);
    return res.status(500).json({error: true, msg: "Internal server error."});
  }

  return cqdo(req, res, 'match (a:Canvasser {id:{id}}) set a.locked=true', req.body, true);
}

function canvasserUnlock(req, res) {
  if (!valid(req.body.id)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'id'."});
  return cqdo(req, res, 'match (a:Canvasser {id:{id}}) remove a.locked', req.body, true);
}

// teams

function teamList(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Team) return a');
  else
    return cqdo(req, res, 'match (a:Canvasser {id:{id}})-[:ASSIGNED]-(b:Team) return b', req.user);
}

function teamCreate(req, res) {
  if (!valid(req.body.name)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'name'."});
  return cqdo(req, res, 'create (a:Team {created: timestamp(), name:{name}})', req.body, true);
}

function teamDelete(req, res) {
  if (!valid(req.body.name)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'name'."});
  return cqdo(req, res, 'match (a:Team {name:{name}}) detach delete a', req.body, true);
}

function teamMembersList(req, res) {
  if (!valid(req.query.teamName)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'teamName'."});
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Canvasser)-[:MEMBERS]-(b:Team {name:{teamName}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (a:Canvasser {id:{id}})-[:MEMBERS]-(b:Team {name:{teamName}}) return a', req.query);
  }
}

function teamMembersAdd(req, res) {
  if (!valid(req.body.teamName) || !valid(req.body.cId)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'teamName' or 'cId'."});
  return cqdo(req, res, 'match (a:Canvasser {id:{cId}}), (b:Team {name:{teamName}}) merge (b)-[:MEMBERS]->(a)', req.body, true);
}

function teamMembersRemove(req, res) {
  if (!valid(req.body.teamName) || valid(!req.body.cId)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'teamName' or 'cId'."});
  return cqdo(req, res, 'match (a:Canvasser {id:{cId}})-[r:MEMBERS]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

// turf

function turfList(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Turf) return a');
  else
    return cqdo(req, res, 'match (a:Canvasser {id:{id}})-[:ASSIGNED]-(b:Team)-[:ASSIGNED]-(c:Turf) return c UNION match (a:Canvasser {id:{id}})-[:ASSIGNED]-(c:Turf) return c', req.user);
}

function turfCreate(req, res) {
  if (!valid(req.body.name)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'name'."});
  if (typeof req.body.geometry !== "object" || typeof req.body.geometry.coordinates !== "object") return res.status(400).json({error: true, msg: "Invalid value to parameter 'geometry'."});
  req.body.geometry = JSON.stringify(req.body.geometry);
  return cqdo(req, res, 'create (a:Turf {created: timestamp(), name:{name}, geometry:{geometry}})', req.body, true);
}

function turfDelete(req, res) {
  if (!valid(req.body.name)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'name'."});
  return cqdo(req, res, 'match (a:Turf {name:{name}}) detach delete a', req.body, true);
}

function turfAssignedTeamList(req, res) {
  if (!valid(req.query.turfName)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'turfName'."});
  return cqdo(req, res, 'match (a:Turf {name:{turfName}})-[:ASSIGNED]-(b:Team) return b', req.query, true);
}

function turfAssignedTeamAdd(req, res) {
  if (!valid(req.body.turfName) || !valid(req.body.teamName)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'turfName' or 'teamName'."});
  return cqdo(req, res, 'match (a:Turf {name:{turfName}}), (b:Team {name:{teamName}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function turfAssignedTeamRemove(req, res) {
  if (!valid(req.body.turfName) || !valid(req.body.teamName)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'turfName' or 'teamName'."});
  return cqdo(req, res, 'match (a:Turf {name:{turfName}})-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

function turfAssignedCanvasserList(req, res) {
  if (!valid(req.query.turfName)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'turfName'."});
  return cqdo(req, res, 'match (a:Turf {name:{turfName}})-[:ASSIGNED]-(b:Canvasser) return b', req.query, true);
}

async function turfAssignedCanvasserAdd(req, res) {
  if (!valid(req.body.turfName) || !valid(req.body.cId)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'turfName' or 'cId'."});
  if (!req.user.admin) return res.status(403).json({error: true, msg: "Permission denied."});

  if (!req.body.override) {
    try {
      let ret;

      ret = await cqa('match (a:Canvasser {id:{cId}}) return a', req.body);
      let c = ret.data[0];

      ret = await cqa('match (a:Turf {name:{turfName}}) return a', req.body);
      let t = ret.data[0];

      if (!pipNode(c, JSON.parse(t.geometry))) return res.status(400).json({error: true, msg: "Canvasser location is not inside that turf."});
    } catch (e) {
      console.warn(e);
      return res.status(500).json({error: true, msg: "Internal server error."});
    }
  }

  return cqdo(req, res, 'match (a:Turf {name:{turfName}}), (b:Canvasser {id:{cId}}) merge (a)-[:ASSIGNED]->(b)', req.body);
}

function turfAssignedCanvasserRemove(req, res) {
  if (!valid(req.body.turfName) || !valid(req.body.cId)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'turfName' or 'cId'."});
  return cqdo(req, res, 'match (a:Turf {name:{turfName}})-[r:ASSIGNED]-(b:Canvasser {id:{cId}}) delete r', req.body, true);
}

// form

async function formGet(req, res) {
  let ass = await canvassAssignments(req.user.id);
  if (!req.user.admin && !idInArrObj(ass.forms, req.query.id)) return res.status(403).json({error: true, msg: "Canvasser is not assigned to this form."});

  let form = {};

  try {
    form = a.data[0][0];
    form.author_id = a.data[0][1].id;
    form.author = a.data[0][1].name;
    let b = await cqa('match (a:Question)-[:ASSIGNED]-(b:Form {id:{id}}) return a', req.query);
    form.questions = b.data;
  } catch (e) {
    console.warn(e);
    return res.status(500).json({error: true, msg: "Internal server error."});
  }

  return res.json(form);
}

function formList(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Form) return a');
  else
    return cqdo(req, res, 'match (a:Canvasser {id:{id}})-[:ASSIGNED]-(b:Team)-[:ASSIGNED]-(c:Form) return c UNION match (a:Canvasser {id:{id}})-[:ASSIGNED]-(c:Form) return c', req.user)
}

function formCreate(req, res) {
  req.body.id = uuidv4();
  req.body.author_id = req.user.id;
  return cqdo(req, res, 'match (a:Canvasser {id:{author_id}}) create (b:Form {created: timestamp(), id:{id}, name:{name}, version:1})-[:AUTHOR]->(a) return b', req.body, true);
}

function formDelete(req, res) {
  if (!valid(req.body.id)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'id'."});
  return cqdo(req, res, 'match (a:Form {id:{id}}) detach delete a', req.body, true);
}

function formAssignedTeamList(req, res) {
  if (!valid(req.query.id)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'id'."});
  return cqdo(req, res, 'match (a:Form {id:{id}})-[:ASSIGNED]-(b:Team) return b', req.query, true);
}

function formAssignedTeamAdd(req, res) {
  if (!valid(req.body.fId) || !valid(req.body.teamName)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'fId' or 'teamName'."});
  return cqdo(req, res, 'match (a:Form {id:{fId}}), (b:Team {name:{teamName}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function formAssignedTeamRemove(req, res) {
  if (!valid(req.body.fId) || !valid(req.body.teamName)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'fId' or 'teamName'."});
  return cqdo(req, res, 'match (a:Form {id:{fId}})-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

function formAssignedCanvasserList(req, res) {
  if (!valid(req.query.id)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'id'."});
  return cqdo(req, res, 'match (a:Form {id:{id}})-[:ASSIGNED]-(b:Canvasser) return b', req.query, true);
}

function formAssignedCanvasserAdd(req, res) {
  if (!valid(req.body.fId) || !valid(req.body.cId)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'fId' or 'cId'."});
  return cqdo(req, res, 'match (a:Form {id:{fId}}), (b:Canvasser {id:{cId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function formAssignedCanvasserRemove(req, res) {
  if (!valid(req.body.fId) || !valid(req.body.cId)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'fId' or 'cId'."});
  return cqdo(req, res, 'match (a:Form {id:{fId}})-[r:ASSIGNED]-(b:Canvasser {id:{cId}}) delete r', req.body, true);
}

// question

async function questionGet(req, res) {
  if (!valid(req.query.key)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'key'."});
  if (!req.user.admin) return res.status(403).json({error: true, msg: "Permission denied."});

  let q = {};

  try {
    // TODO: use cqdo() and format the code in the cypher return rather than in javascript code
    let a = await cqa('match (a:Question {key:{key}})-[:AUTHOR]-(b:Canvasser) return a,b', req.query);

    if (a.data.length === 1) {
      q = a.data[0][0];
      q.author_id = a.data[0][1].id;
      q.author = a.data[0][1].name;
    }
  } catch (e) {
    console.warn(e);
    return res.status(500).json({error: true, msg: "Internal server error."});
  }

  return res.json(q);
}

function questionList(req, res) {
  return cqdo(req, res, 'match (a:Question) return a', {}, true);
}

function questionCreate(req, res) {
   if (!valid(req.body.key) || !valid(req.body.label) || !valid(req.body.type)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'key' or 'label' or 'type'."});
   req.body.author_id = req.user.id;

   switch (req.body.type) {
     case 'String':
     case 'TEXTBOX':
     case 'Number':
     case 'Boolean':
     case 'SAND':
       break;
     default: return res.status(400).json({error: true, msg: "Invalid value to parameter 'type'."});
   }

   return cqdo(req, res, 'match (a:Canvasser {id:{author_id}}) create (b:Question {created: timestamp(), key:{key}, label:{label}, type:{type}})-[:AUTHOR]->(a)', req.body, true);
}

function questionDelete(req, res) {
  if (!valid(req.body.key)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'key'."});
  return cqdo(req, res, 'match (a:Question {key:{key}}) detach delete a', req.body, true);
}

function questionAssignedList(req, res) {
  if (!valid(req.query.key)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'key'."});
  return cqdo(req, res, 'match (a:Question {key:{key}})-[:ASSIGNED]-(b:Form) return b', req.query, true);
}

function questionAssignedAdd(req, res) {
  if (!valid(req.body.key) || !valid(req.body.fId)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'key' or 'fId'."});
  return cqdo(req, res, 'match (a:Question {key:{key}}), (b:Form {id:{fId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function questionAssignedRemove(req, res) {
  if (!valid(req.body.key) || !valid(req.body.fId)) return res.status(400).json({error: true, msg: "Invalid value to parameter 'key' or 'fId'."});
  return cqdo(req, res, 'match (a:Question {key:{key}})-[r:ASSIGNED]-(b:Form {id:{fId}}) delete r', req.body, true);
}

// sync

async function sync(req, res) {
  let ass = await canvassAssignments(req.user.id);
  if (!ass.ready) return res.status(403).json({error: true, msg: "Canvasser is not assigned."});

  let formId = req.body.formId;
  if (!idInArrObj(ass.forms, formId)) return res.status(403).json({error: true, msg: "Canvasser is not assigned to this form."});

  let last_sync = req.body.last_sync;
  if (isNaN(last_sync)) last_sync = 0;

  if (typeof req.body.nodes !== "object") return res.status(400).json({error: true, msg: "nodes must be an object."});
  let inodes = Object.keys(req.body.nodes);

  // get all turf geometries
  let turfs = [];

  try {
    let ref = await cqa('match (a:Turf) return a');
    for (let i in ref.data) {
      let turf = ref.data[i];
      turf.geometry = JSON.parse(turf.geometry);
      turfs.push(turf);
    }
  } catch (e) {
    console.warn(e);
    return res.status(500).json({error: true, msg: "Internal server error."});
  }

  for (let n in inodes) {
    let node = req.body.nodes[inodes[n]];

    // ensure numeric timestamps
    node.created = Number.parseInt(node.created, 10);
    if (isNaN(node.created)) node.created = new Date().getTime();
    node.updated = Number.parseInt(node.updated, 10);
    if (isNaN(node.updated)) node.updated = new Date().getTime();

    try {
      switch (node.type) {
        case 'address':
          node.longitude = node.latlng.longitude;
          node.latitude = node.latlng.latitude;
          node.street = node.address[0];
          node.city = node.address[1];
          node.state = node.address[2]
          node.zip = node.address[3];
          await cqa('merge (a:Address {id:{id}}) on create set a += {created:{created},updated:{updated},last_seen:timestamp(),longitude:{longitude},latitude:{latitude},street:{street},city:{city},state:{state},zip:{zip},multi_unit:{multi_unit}} on match set a += {created:{created},updated:{updated},last_seen:timestamp(),longitude:{longitude},latitude:{latitude},street:{street},city:{city},state:{state},zip:{zip},multi_unit:{multi_unit}}', node);
          // tie this address to turf
          // TODO: this won't scale - need to use neo4j native geo functions
          for (let t in turfs)
            if (pipNode(node, turfs[t].geometry))
              await cqa('match (a:Address {id:{id}}) merge (a)-[:WITHIN]->(b:Turf {name:{name}})', {id: node.id, name: turfs[t].name});
          break;
        case 'unit':
          await cqa('merge (a:Unit {id:{id}}) on create set a += {created:{created},updated:{updated},last_seen:timestamp(),unit:{unit}} on match set a += {created:{created},updated:{updated},last_seen:timestamp(),unit:{unit}}', node);
          break;
        case 'survey':
          await cqa('merge (a:Survey {id:{id}}) on create set a += {created:{created},updated:{updated},last_seen:timestamp(),status:{status}} on match set a += {created:{created},updated:{updated},last_seen:timestamp(),status:{status}}', node);
          // TODO: survey: object of question keys and answers
          break;
        default:
          if (ovi_config.DEBUG) {
            console.warn("Unknown type: "+node.type);
            console.warn(node);
          }
      }

      if (node.parent_id) await cqa('MATCH (a {id:{id}}), (b {id:{parent_id}}) merge (a)-[:PARENT]->(b)', node);
      // TODO: link to canvasser
    } catch (e) {
      console.log(e);
    }
  }

  let onodes = {
    formId: formId,
    nodes: {},
  };

  // TODO: limit nodes based on relationship to Address, and whether address is pip Turf.geometry
  try {
    let ret;
    let t = {last_sync: last_sync};

    ret = await cqa('match (a:Address) where a.last_seen > {last_sync} return a', t);
    for (let i in ret.data) {
      let node = ret.data[i];
      onodes[node.id] = {
        type: 'address',
        id: node.id,
        created: node.created,
        updated: node.updated,
        multi_unit: node.multi_unit,
        latlng: {longitude: node.longitude, latitude: node.latitude},
        address: [node.street, node.city, node.state, node.zip],
      };
    }

    ret = await cqa('match (a:Address {multi_unit: true})-[]-(b:Unit) where b.last_seen > {last_sync} set b.parent_id = a.id return b', t);
    for (let i in ret.data) {
      let node = ret.data[i];
      node.type = 'unit';
      onodes[node.id] = node;
    }

    ret = await cqa('match (a)-[]-(b:Survey) where b.last_seen > {last_sync} set b.parent_id = a.id return b', t);
    for (let i in ret.data) {
      let node = ret.data[i];
      node.type = 'survey';
      onodes[node.id] = node;
    }

  } catch (e) {
    console.warn(e);
    return res.status(500).json({error: true, msg: "Internal server error."});
  }

  return res.json(onodes);
}

// Initialize http server
const app = expressAsync(express());
app.disable('x-powered-by');
app.use(expressLogging(logger));
app.use(bodyParser.json({limit: '5mb'}));
app.use(cors());

// require ip_header if config for it is set
if (!ovi_config.DEBUG && ovi_config.ip_header) {
  app.use(function (req, res, next) {
    if (!req.header(ovi_config.ip_header)) {
      console.log('Connection without '+ovi_config.ip_header+' header');
      res.status(400).json({error: true, msg: "Missing required header."});
    }
    else next();
  });
}

// add req.user if there's a valid JWT
app.use(async function (req, res, next) {

  if (req.method == 'OPTIONS') return next(); // skip OPTIONS requests

  // log activity
  function logIt() {
    if (!req.user.id) return;
    let obj = (req.body ? req.body : req.query);
    try {
      cqa('match (a:Canvasser {id:{id}}) merge (l:Log {uri:{uri}}) merge (a)-[:HTTP {code:{code},time:timestamp(),input:{input}}]-(l)', {id: req.user.id, code: res.statusCode, uri: req.route.path, input: JSON.stringify(obj)});
    } catch (e) {}
  }

  res.set('x-sm-oauth-url', ovi_config.sm_oauth);
  res.on('finish', logIt, req, res);

  req.user = {};

  // uri whitelist
  if (req.url == '/poke') return next();

  try {
    let u;
    if (!req.header('authorization')) return res.status(400).json({error: true, msg: "Missing required header."});
    u = jwt.verify(req.header('authorization').split(' ')[1], public_key);

    // verify props
    if (!u.id) return res.status(400).json({error: true, msg: "Your token is missing a required parameter."});
    if (u.iss !== jwt_iss) return res.status(403).json({error: true, msg: "Your token was issued for a different domain."});

    if (!u.email) u.email = "";
    if (!u.avatar) u.avatar = "";

    let a = await cqa('merge (a:Canvasser {id:{id}}) on match set a += {last_seen: timestamp(), name:{name}, email:{email}, avatar:{avatar}} on create set a += {created: timestamp(), name:{name}, email:{email}, avatar:{avatar}} return a', u);
    if (a.data.length === 1) {
      req.user = a.data[0];
    } else return res.status(500).json({error: true, msg: "Internal server error."});

    if (req.user.locked) return res.status(403).json({error: true, msg: "Your account is locked."});

  } catch (e) {
    console.warn(e);
    return res.status(401).json({error: true, msg: "Invalid token."});
  }

  // validate all keys in req.body and req.query
  let kb = Object.keys(req.body);
  for (let i in kb) if (!safe_input(req.body[kb[i]])) return res.status(400).json({error: true, msg: "Invalid input."});
  let kq = Object.keys(req.query);
  for (let i in kq) if (!safe_input(req.query[kq[i]])) return res.status(400).json({error: true, msg: "Invalid input."});

  next();
});

// internal routes
app.get('/poke', poke);

// ws routes
app.post('/canvass/v1/hello', hello);
app.get('/canvass/v1/uncle', uncle);
app.get('/canvass/v1/canvasser/list', canvasserList);
app.get('/canvass/v1/canvasser/get', canvasserGet);
app.post('/canvass/v1/canvasser/update', canvasserUpdate);
app.get('/canvass/v1/canvasser/unassigned', canvasserUnassigned);
app.post('/canvass/v1/canvasser/lock', canvasserLock);
app.post('/canvass/v1/canvasser/unlock', canvasserUnlock);
app.get('/canvass/v1/team/list', teamList);
app.post('/canvass/v1/team/create', teamCreate);
app.post('/canvass/v1/team/delete', teamDelete);
app.get('/canvass/v1/team/members/list', teamMembersList);
app.post('/canvass/v1/team/members/add', teamMembersAdd);
app.post('/canvass/v1/team/members/remove', teamMembersRemove);
app.get('/canvass/v1/turf/list', turfList);
app.post('/canvass/v1/turf/create', turfCreate);
app.post('/canvass/v1/turf/delete', turfDelete);
app.get('/canvass/v1/turf/assigned/team/list', turfAssignedTeamList);
app.post('/canvass/v1/turf/assigned/team/add', turfAssignedTeamAdd);
app.post('/canvass/v1/turf/assigned/team/remove', turfAssignedTeamRemove);
app.get('/canvass/v1/turf/assigned/canvasser/list', turfAssignedCanvasserList);
app.post('/canvass/v1/turf/assigned/canvasser/add', turfAssignedCanvasserAdd);
app.post('/canvass/v1/turf/assigned/canvasser/remove', turfAssignedCanvasserRemove);
app.get('/canvass/v1/form/get', formGet);
app.get('/canvass/v1/form/list', formList);
app.post('/canvass/v1/form/create', formCreate);
app.post('/canvass/v1/form/delete', formDelete);
app.get('/canvass/v1/form/assigned/team/list', formAssignedTeamList);
app.post('/canvass/v1/form/assigned/team/add', formAssignedTeamAdd);
app.post('/canvass/v1/form/assigned/team/remove', formAssignedTeamRemove);
app.get('/canvass/v1/form/assigned/canvasser/list', formAssignedCanvasserList);
app.post('/canvass/v1/form/assigned/canvasser/add', formAssignedCanvasserAdd);
app.post('/canvass/v1/form/assigned/canvasser/remove', formAssignedCanvasserRemove);
app.get('/canvass/v1/question/get', questionGet);
app.get('/canvass/v1/question/list', questionList);
app.post('/canvass/v1/question/create', questionCreate);
app.post('/canvass/v1/question/delete', questionDelete);
app.get('/canvass/v1/question/assigned/list', questionAssignedList);
app.post('/canvass/v1/question/assigned/add', questionAssignedAdd);
app.post('/canvass/v1/question/assigned/remove', questionAssignedRemove);
app.post('/canvass/v1/sync', sync);

Object.keys(ovi_config).forEach((k) => {
  delete process.env[k.toUpperCase()];
});
require = null;

if (!ovi_config.DEBUG) {
  process.on('SIGUSR1', () => {
    //process.exit(1);
    throw "Caught SIGUSR1, exiting."
  });
}

// Launch the server
const server = app.listen(ovi_config.server_port, () => {
  const { address, port } = server.address();
  console.log('canvass-broker express');
  console.log(`Listening at http://${address}:${port}`);
});

