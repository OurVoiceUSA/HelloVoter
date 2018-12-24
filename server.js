
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
import {ingeojson} from 'ourvoiceusa-sdk-js';
import circleToPolygon from 'circle-to-polygon';
import wkx from 'wkx';
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
  google_maps_key: getConfig("google_maps_key", false, null),
  sm_oauth_url: getConfig("sm_oauth_url", false, 'https://ws.ourvoiceusa.org/auth'),
  wabase: getConfig("wabase", false, 'https://apps.ourvoiceusa.org'),
  DEBUG: getConfig("debug", false, false),
};

var version = require('./package.json').version;

var public_key;
var jwt_iss = 'ourvoiceusa.org';

if (ovi_config.jwt_pub_key) {
  public_key = fs.readFileSync(ovi_config.jwt_pub_key);
} else {
  console.log("JWT_PUB_KEY not defined, attempting to fetch from "+ovi_config.sm_oauth_url+'/pubkey');
  fetch(ovi_config.sm_oauth_url+'/pubkey')
  .then(res => {
    jwt_iss = res.headers.get('x-jwt-iss');
    if (res.status !== 200) throw "http code "+res.status;
    return res.text()
  })
  .then(body => {
    public_key = body;
  })
  .catch((e) => {
    console.log("Unable to read SM_OAUTH_URL "+ovi_config.sm_oauth_url);
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
  ['turf','canvasser','address'].forEach((i) => cqa('call spatial.addWKTLayer({type}, \'wkt\')', {type: i}).catch(e => {}));
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
    return _403(res, "Permission denied.");

  let ref;

  try {
    ref = await cqa(q, p);
  } catch (e) {
    return _500(res, e);
  }

  return res.status(200).json({msg: "OK", data: ref.data});
}

function idInArrObj (arr, id) {
  for (let i in arr)
    if (arr[i].id === id) return true;
  return false;
}

function sendError(res, code, msg) {
  let obj = {code: code, error: true, msg: msg};
  console.log('Returning http '+code+' error with msg: '+msg);
  return res.status(code).json(obj);
}

function _400(res, msg) {
  return sendError(res, 400, msg);
}

function _401(res, msg) {
  return sendError(res, 401, msg);
}

function _403(res, msg) {
  return sendError(res, 403, msg);
}

function _500(res, obj) {
  console.warn(obj);
  return sendError(res, 500, "Internal server error.");
}

async function canvasserCanSee(ida, idb) {
  if (ida === idb) return true;

  try {
    let ref = await cqa('match (a:Canvasser {id:{ida}})-[:MEMBERS {leader:true}]-(:Team)-[]-(t:Turf) where t.wkt is not null call spatial.intersects("canvasser", t.wkt) yield node where node.id = {idb} return node UNION match (a:Canvasser {id:{ida}})-[:MEMBERS]-(:Team)-[:MEMBERS]-(c:Canvasser) return distinct(c) as node', {ida: ida, idb: idb});
    if (ref.data.length > 0)
      return true;
  } catch (e) {
    console.warn(e);
  }

  return false;
}

async function canvassAssignments(user) {
  let ref;
  let obj = {
    ready: false,
    direct: false,
    turf: [],
    teams: [],
    forms: [],
  };

  try {
    // direct assignment to a form
    ref = await cqa('match (a:Canvasser {id:{id}}) optional match (a)-[:ASSIGNED]-(b:Form) optional match (a)-[:ASSIGNED]-(c:Turf) return collect(distinct(b)), collect(distinct(c))', user);
    if (ref.data[0][0].length > 0 || ref.data[0][1].length) {
      obj.forms = obj.forms.concat(ref.data[0][0]);
      obj.turf = obj.turf.concat(ref.data[0][1]);
      obj.direct = true;

      if (user.autoturf && user.homelng && user.homelat) {
        obj.turf = [{name: 'auto', geometry: circleToPolygon([user.homelng,user.homelat],1000)}];
      }
    }

    // assingment to form/turf via team, but only bother checking if not directly assigned
    if (!obj.direct) {
      ref = await cqa('match (a:Canvasser {id:{id}}) optional match (a)-[:MEMBERS]-(b:Team) optional match (b)-[:ASSIGNED]-(c:Turf) optional match (d:Form)-[:ASSIGNED]-(b) return collect(distinct(b)), collect(distinct(c)), collect(distinct(d))', user);
      if (ref.data[0][0].length > 0 || ref.data[0][1].length > 0 || ref.data[0][2].length > 0) {
        obj.teams = obj.teams.concat(ref.data[0][0]);
        obj.turf = obj.turf.concat(ref.data[0][1]);
        obj.forms = obj.forms.concat(ref.data[0][2]);
      }
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

function towebapp(req, res) {
  let host = req.header('host');
  res.redirect(ovi_config.wabase+'/HelloVoter/'+(host?'?server='+host:''));
}

// they say that time's supposed to heal ya but i ain't done much healin'

async function hello(req, res) {
  let lng = req.body.longitude;
  let lat = req.body.latitude;

  let msg = "Awaiting assignment";
  let ass = await canvassAssignments(req.user);

  try {
    // if there are no admins, make this one an admin
    let ref = await cqa('match (a:Canvasser {admin:true}) return count(a)');
    if (ref.data[0] === 0) {
      await cqa('match (a:Canvasser {id:{id}}) set a.admin=true', req.user);
      req.user.admin = true;
    }

    // Butterfly in the sky, I can go twice as high.
    if (req.user.admin === true) ass.admin = true;

    // web browser doesn't send this
    if (lat && lng) 
      await cqa('match (a:Canvasser {id:{id}}) set a.longitude={lng}, a.latitude={lat}', {id: req.user.id, lng: lng, lat: lat});
  } catch (e) {
    return _500(res, e);
  }

  if (ass.ready)
    msg = "You are assigned turf and ready to canvass!";

  return res.json({msg: msg, data: ass});
}

function uncle(req, res) {
  return res.json({name: "Bob"});
}

async function dashboard(req, res) {
  try {
    if (req.user.admin === true) return res.json({
      canvassers: (await cqa('match (a:Canvasser) return count(a)')).data[0],
      teams: (await cqa('match (a:Team) return count(a)')).data[0],
      turfs: (await cqa('match (a:Turf) return count(a)')).data[0],
      questions: (await cqa('match (a:Question) return count(a)')).data[0],
      forms: (await cqa('match (a:Form) return count(a)')).data[0],
      addresses: (await cqa('match (a:Address) where not a.multi_unit = true return count(a)')).data[0]+(await cqa('match (a:Unit) return count(a)')).data[0],
      version: version,
    });
    else {
      let ass = await canvassAssignments(req.user);
      return res.json({
        canvassers: (await cqa('match (a:Canvasser {id:{id}})-[:MEMBERS {leader:true}]-(:Team)-[]-(t:Turf) where t.wkt is not null call spatial.intersects("canvasser", t.wkt) yield node return node UNION match (a:Canvasser {id:{id}}) optional match (a)-[:MEMBERS]-(:Team)-[:MEMBERS]-(c:Canvasser) return distinct(c) as node', req.user)).data.length,
        teams: ass.teams.length,
        turfs: ass.turf.length,
        questions: 'N/A',
        forms: ass.forms.length,
        addresses: 'N/A',
        version: (ass.ready?version:null),
      });
    }
  } catch (e) {
    return _500(res, e);
  }
  return res.json({});
}

async function google_maps_key(req, res) {
  let ass = await canvassAssignments(req.user);
  if (ass.ready || req.user.admin) return res.json({google_maps_key: ovi_config.google_maps_key });
  else return _401(res, "No soup for you");
}

// canvassers

// get the canvassers from the given query, and populate relationships

async function _canvassersFromCypher(query, args) {
  let canvassers = [];

  let ref = await cqa(query, args)
  for (let i in ref.data) {
    let c = ref.data[i];
    c.ass = await canvassAssignments(c);
    canvassers.push(c);
  }

  return canvassers;
}

async function canvasserList(req, res) {
  let canvassers = [];

  try {
    let ref;

    if (req.user.admin)
      canvassers = await _canvassersFromCypher('match (a:Canvasser) return a');
    else
      canvassers = await _canvassersFromCypher('match (a:Canvasser {id:{id}})-[:MEMBERS {leader:true}]-(:Team)-[]-(t:Turf) where t.wkt is not null call spatial.intersects("canvasser", t.wkt) yield node return node UNION match (a:Canvasser {id:{id}}) optional match (a)-[:MEMBERS]-(:Team)-[:MEMBERS]-(c:Canvasser) return distinct(c) as node', req.user);
  } catch (e) {
    return _500(res, e);
  }

  return res.json(canvassers);
}

async function canvasserGet(req, res) {
  if (!req.user.admin && req.query.id !== req.user.id && !await canvasserCanSee(req.user.id, req.query.id)) return _403(res, "Permission denied.");

  let canvassers = [];

  try {
    canvassers = await _canvassersFromCypher('match (a:Canvasser {id:{id}}) return a', req.query);
  } catch (e) {
    return _500(res, e);
  }

  return res.json(canvassers[0]);
}

async function canvasserUpdate(req, res) {
  if (!req.user.admin && req.body.id !== req.user.id) return _403(res, "Permission denied.");
  // TODO: need to validate input, and only do updates based on what was posted
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");

  req.body.wkt = "POINT("+req.body.lng+" "+req.body.lat+")";

  try {
    await cqa('match (a:Canvasser {id:{id}}) set a.homeaddress={address}, a.homelat={lat}, a.homelng={lng}, a.wkt={wkt}', req.body);
  } catch (e) {
    return _500(res, e);
  }

  return cqdo(req, res, 'match (a:Canvasser {id:{id}}) where not (a)<-[:RTREE_REFERENCE]-() with collect(a) as nodes call spatial.addNodes("canvasser", nodes) yield count return count', req.body, true);
}

async function canvasserLock(req, res) {
  if (req.body.id === req.user.id) return _403(res, "You can't lock yourself.");

  try {
    let ref = await cqa("match (a:Canvasser {id:{id}}) return a", req.body);
    if (ref.data[0] && ref.data[0].admin === true)
      return _403(res, "Permission denied.");
  } catch(e) {
    return _500(res, e);
  }

  return cqdo(req, res, 'match (a:Canvasser {id:{id}}) set a.locked=true', req.body, true);
}

function canvasserUnlock(req, res) {
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");
  return cqdo(req, res, 'match (a:Canvasser {id:{id}}) remove a.locked', req.body, true);
}

// teams

function teamList(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Team) return a');
  else
    return cqdo(req, res, 'match (a:Canvasser {id:{id}})-[:MEMBERS]-(b:Team) return b', req.user);
}

function teamCreate(req, res) {
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");
  return cqdo(req, res, 'create (a:Team {created: timestamp(), name:{name}})', req.body, true);
}

function teamDelete(req, res) {
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");
  return cqdo(req, res, 'match (a:Team {name:{name}}) detach delete a', req.body, true);
}

async function teamMembersList(req, res) {
  if (!valid(req.query.teamName)) return _400(res, "Invalid value to parameter 'teamName'.");

  let canvassers = [];

  try {
    if (req.user.admin)
      canvassers = await _canvassersFromCypher('match (a:Canvasser)-[:MEMBERS]-(b:Team {name:{teamName}}) return a', req.query);
    else {
      req.query.id = req.user.id;
      canvassers = await _canvassersFromCypher('match (a:Canvasser {id:{id}})-[:MEMBERS]-(b:Team {name:{teamName}}) optional match (b)-[:MEMBERS]-(c:Canvasser) return distinct(c)', req.query);
    }
  } catch (e) {
    return _500(res, e);
  }

  return res.json(canvassers);
}

function teamMembersAdd(req, res) {
  if (!valid(req.body.teamName) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'teamName' or 'cId'.");
  return cqdo(req, res, 'match (a:Canvasser {id:{cId}}), (b:Team {name:{teamName}}) merge (b)-[:MEMBERS]->(a)', req.body, true);
}

function teamMembersRemove(req, res) {
  if (!valid(req.body.teamName) || valid(!req.body.cId)) return _400(res, "Invalid value to parameter 'teamName' or 'cId'.");
  return cqdo(req, res, 'match (a:Canvasser {id:{cId}})-[r:MEMBERS]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

function teamMembersWipe(req, res) {
  if (!valid(req.body.teamName)) return _400(res, "Invalid value to parameter 'teamName'.");
  return cqdo(req, res, 'match (a:Canvasser)-[r:MEMBERS]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

function teamTurfList(req, res) {
  if (!valid(req.query.teamName)) return _400(res, "Invalid value to parameter 'teamName'.");
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Turf)-[:ASSIGNED]-(b:Team {name:{teamName}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (a:Turf)-[:ASSIGNED]-(b:Team {name:{teamName}})-[:MEMBERS]-(c:Canvasser {id:{id}}) return a', {
      teamName: req.query.teamName,
      id: req.user.id,
    });
  }
}

function teamTurfAdd(req, res) {
  if (!valid(req.body.teamName) || !valid(req.body.turfName)) return _400(res, "Invalid value to parameter 'teamName' or 'turfName'.");
  return cqdo(req, res, 'match (a:Turf {name:{turfName}}), (b:Team {name:{teamName}}) merge (b)-[:ASSIGNED]->(a)', req.body, true);
}

function teamTurfRemove(req, res) {
  if (!valid(req.body.teamName) || valid(!req.body.turfName)) return _400(res, "Invalid value to parameter 'teamName' or 'turfName'.");
  return cqdo(req, res, 'match (a:Turf {name:{turfName}})-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

function teamTurfWipe(req, res) {
  if (!valid(req.body.teamName)) return _400(res, "Invalid value to parameter 'teamName'.");
  return cqdo(req, res, 'match (a:Turf)-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

function teamFormList(req, res) {
  if (!valid(req.query.teamName)) return _400(res, "Invalid value to parameter 'teamName'.");
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Form)-[:ASSIGNED]-(b:Team {name:{teamName}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (a:Form)-[:ASSIGNED]-(b:Team {name:{teamName}})-[:MEMBERS]-(c:Canvasser {id:{id}}) return a', {
      teamName: req.query.teamName,
      id: req.user.id,
    });
  }
}

function teamFormAdd(req, res) {
  if (!valid(req.body.teamName) || !valid(req.body.fId)) return _400(res, "Invalid value to parameter 'teamName' or 'fId'.");
  return cqdo(req, res, 'match (a:Form {id:{fId}}), (b:Team {name:{teamName}}) merge (b)-[:ASSIGNED]->(a)', req.body, true);
}

function teamFormRemove(req, res) {
  if (!valid(req.body.teamName) || valid(!req.body.fId)) return _400(res, "Invalid value to parameter 'teamName' or 'fId'.");
  return cqdo(req, res, 'match (a:Form {id:{fId}})-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

function teamFormWipe(req, res) {
  if (!valid(req.body.teamName)) return _400(res, "Invalid value to parameter 'teamName'.");
  return cqdo(req, res, 'match (a:Form)-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.body, true);
}


// turf

function turfList(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Turf) return a');
  else
    return cqdo(req, res, 'match (a:Canvasser {id:{id}})-[:MEMBERS]-(b:Team)-[:ASSIGNED]-(c:Turf) return c UNION match (a:Canvasser {id:{id}})-[:ASSIGNED]-(c:Turf) return c', req.user);
}

function turfCreate(req, res) {
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");
  if (typeof req.body.geometry !== "object" || typeof req.body.geometry.coordinates !== "object") return _400(res, "Invalid value to parameter 'geometry'.");

  try {
    req.body.wkt = wkx.Geometry.parseGeoJSON(req.body.geometry).toEwkt().split(';')[1];
  } catch (e) {
    return _500(res, e);
  }

  // store geojson too as string
  req.body.geometry = JSON.stringify(req.body.geometry);

  return cqdo(req, res, 'create (a:Turf {created: timestamp(), name:{name}, geometry: {geometry}, wkt:{wkt}}) WITH collect(a) AS t CALL spatial.addNodes(\'turf\', t) YIELD count return count', req.body, true);
}

function turfDelete(req, res) {
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");
  return cqdo(req, res, 'match (a:Turf {name:{name}}) detach delete a', req.body, true);
}

function turfAssignedTeamList(req, res) {
  if (!valid(req.query.turfName)) return _400(res, "Invalid value to parameter 'turfName'.");
  return cqdo(req, res, 'match (a:Turf {name:{turfName}})-[:ASSIGNED]-(b:Team) return b', req.query, true);
}

function turfAssignedTeamAdd(req, res) {
  if (!valid(req.body.turfName) || !valid(req.body.teamName)) return _400(res, "Invalid value to parameter 'turfName' or 'teamName'.");
  return cqdo(req, res, 'match (a:Turf {name:{turfName}}), (b:Team {name:{teamName}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function turfAssignedTeamRemove(req, res) {
  if (!valid(req.body.turfName) || !valid(req.body.teamName)) return _400(res, "Invalid value to parameter 'turfName' or 'teamName'.");
  return cqdo(req, res, 'match (a:Turf {name:{turfName}})-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

async function turfAssignedCanvasserList(req, res) {
  if (!valid(req.query.turfName)) return _400(res, "Invalid value to parameter 'turfName'.");

  let canvassers;

  try {
    canvassers = await _canvassersFromCypher('match (a:Turf {name:{turfName}})-[:ASSIGNED]-(b:Canvasser) return b', req.query, true);
  } catch (e) {
    return _500(res, e)
  }

  return res.json(canvassers);
}

async function turfAssignedCanvasserAdd(req, res) {
  if (!valid(req.body.turfName) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'turfName' or 'cId'.");
  if (!req.user.admin) return _403(res, "Permission denied.");

  if (req.body.turfName === 'auto')
    return cqdo(req, res, "match (a:Canvasser {id:{cId}}) set a.autoturf=true", req.body, true);

  if (!req.body.override) {
    try {
      let ret;

      ret = await cqa('match (a:Canvasser {id:{cId}}) return a', req.body);
      let c = ret.data[0];

      ret = await cqa('match (a:Turf {name:{turfName}}) return a', req.body);
      let t = ret.data[0];

      // TODO: config option for whether or not we care...
      //if (!ingeojson(JSON.parse(t.geometry), c.longitude, c.latitude)) return _400(res, "Canvasser location is not inside that turf.");
    } catch (e) {
      return _500(res, e);
    }
  }

  return cqdo(req, res, 'match (a:Turf {name:{turfName}}), (b:Canvasser {id:{cId}}) merge (a)-[:ASSIGNED]->(b)', req.body);
}

function turfAssignedCanvasserRemove(req, res) {
  if (!valid(req.body.turfName) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'turfName' or 'cId'.");

  if (req.body.turfName === 'auto')
    return cqdo(req, res, "match (a:Canvasser {id:{cId}}) set a.autoturf=null", req.body, true);

  return cqdo(req, res, 'match (a:Turf {name:{turfName}})-[r:ASSIGNED]-(b:Canvasser {id:{cId}}) delete r', req.body, true);
}

// form

async function formGet(req, res) {
  let ass = await canvassAssignments(req.user);
  if (!req.user.admin && !idInArrObj(ass.forms, req.query.id)) return _403(res, "Canvasser is not assigned to this form.");

  let form = {};

  try {
    let a = await cqa('match (a:Form {id:{id}})-[:AUTHOR]-(b:Canvasser) return a,b', req.query);
    form = a.data[0][0];
    form.author_id = a.data[0][1].id;
    form.author = a.data[0][1].name;
    form.questions = {};
    let b = await cqa('match (a:Question)-[:ASSIGNED]-(b:Form {id:{id}}) return a', req.query);
    // convert from an array of objects to an objects of objects
    b.data.forEach((q) => {
      let key = q.key;
      form.questions[key] = q;
      delete form.questions[key].key;
    });
  } catch (e) {
    return _500(res, e);
  }

  return res.json(form);
}

function formList(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Form) return a');
  else
    return cqdo(req, res, 'match (a:Canvasser {id:{id}})-[:ASSIGNED]-(b:Team)-[:ASSIGNED]-(c:Form) return c UNION match (a:Canvasser {id:{id}})-[:ASSIGNED]-(c:Form) return c', req.user)
}

async function formCreate(req, res) {
  if (!valid(req.body.name) || !valid(req.body.questions) || !valid(req.body.questions_order) ||
    typeof req.body.questions !== "object" || typeof req.body.questions_order !== "object")
    return _400(res, "Invalid value to parameter 'name' or 'questions' or 'questions_order'.");

  req.body.id = uuidv4();
  req.body.author_id = req.user.id;

  try {
    await cqa('match (a:Canvasser {id:{author_id}}) create (b:Form {created: timestamp(), updated: timestamp(), id:{id}, name:{name}, questions_order:{questions_order}, version:1})-[:AUTHOR]->(a)', req.body);

    // question is an object of objects, whos schema is; key: {label: , optional: , type: }
    Object.keys(req.body.questions).forEach(async (key) => {
      let q = req.body.questions[key];
      q.key = key;
      q.author_id = req.user.id;
      q.fId = req.body.id;
      await cqa('match (a:Canvasser {id:{author_id}}) match (b:Form {id:{fId}}) create (b)<-[:ASSIGNED]-(c:Question {key:{key}, label:{label}, optional:{optional}, type:{type}})-[:AUTHOR]->(a)', q);
    });
  } catch (e) {
    return _500(res, e);
  }

  return res.json({id: req.body.id});
}

function formDelete(req, res) {
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");
  return cqdo(req, res, 'match (a:Form {id:{id}}) detach delete a', req.body, true);
}

function formAssignedTeamList(req, res) {
  if (!valid(req.query.id)) return _400(res, "Invalid value to parameter 'id'.");
  return cqdo(req, res, 'match (a:Form {id:{id}})-[:ASSIGNED]-(b:Team) return b', req.query, true);
}

function formAssignedTeamAdd(req, res) {
  if (!valid(req.body.fId) || !valid(req.body.teamName)) return _400(res, "Invalid value to parameter 'fId' or 'teamName'.");
  return cqdo(req, res, 'match (a:Form {id:{fId}}), (b:Team {name:{teamName}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function formAssignedTeamRemove(req, res) {
  if (!valid(req.body.fId) || !valid(req.body.teamName)) return _400(res, "Invalid value to parameter 'fId' or 'teamName'.");
  return cqdo(req, res, 'match (a:Form {id:{fId}})-[r:ASSIGNED]-(b:Team {name:{teamName}}) delete r', req.body, true);
}

async function formAssignedCanvasserList(req, res) {
  if (!valid(req.query.id)) return _400(res, "Invalid value to parameter 'id'.");

  let canvassers;

  try {
    canvassers = await _canvassersFromCypher('match (a:Form {id:{id}})-[:ASSIGNED]-(b:Canvasser) return b', req.query, true);
  } catch (e) {
    return _500(res, e)
  }

  return res.json(canvassers);
}

function formAssignedCanvasserAdd(req, res) {
  if (!valid(req.body.fId) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'fId' or 'cId'.");
  return cqdo(req, res, 'match (a:Form {id:{fId}}), (b:Canvasser {id:{cId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function formAssignedCanvasserRemove(req, res) {
  if (!valid(req.body.fId) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'fId' or 'cId'.");
  return cqdo(req, res, 'match (a:Form {id:{fId}})-[r:ASSIGNED]-(b:Canvasser {id:{cId}}) delete r', req.body, true);
}

// question

async function questionGet(req, res) {
  if (!valid(req.query.key)) return _400(res, "Invalid value to parameter 'key'.");
  if (!req.user.admin) return _403(res, "Permission denied.");

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
    return _500(res, e);
  }

  return res.json(q);
}

function questionList(req, res) {
  return cqdo(req, res, 'match (a:Question) return a', {}, true);
}

function questionCreate(req, res) {
   if (!valid(req.body.key) || !valid(req.body.label) || !valid(req.body.type)) return _400(res, "Invalid value to parameter 'key' or 'label' or 'type'.");
   req.body.author_id = req.user.id;

   switch (req.body.type) {
     case 'String':
     case 'TEXTBOX':
     case 'Number':
     case 'Boolean':
     case 'SAND':
       break;
     default: return _400(res, "Invalid value to parameter 'type'.");
   }

   return cqdo(req, res, 'match (a:Canvasser {id:{author_id}}) create (b:Question {created: timestamp(), key:{key}, label:{label}, type:{type}})-[:AUTHOR]->(a)', req.body, true);
}

function questionDelete(req, res) {
  if (!valid(req.body.key)) return _400(res, "Invalid value to parameter 'key'.");
  return cqdo(req, res, 'match (a:Question {key:{key}}) detach delete a', req.body, true);
}

function questionAssignedList(req, res) {
  if (!valid(req.query.key)) return _400(res, "Invalid value to parameter 'key'.");
  return cqdo(req, res, 'match (a:Question {key:{key}})-[:ASSIGNED]-(b:Form) return b', req.query, true);
}

function questionAssignedAdd(req, res) {
  if (!valid(req.body.key) || !valid(req.body.fId)) return _400(res, "Invalid value to parameter 'key' or 'fId'.");
  return cqdo(req, res, 'match (a:Question {key:{key}}), (b:Form {id:{fId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function questionAssignedRemove(req, res) {
  if (!valid(req.body.key) || !valid(req.body.fId)) return _400(res, "Invalid value to parameter 'key' or 'fId'.");
  return cqdo(req, res, 'match (a:Question {key:{key}})-[r:ASSIGNED]-(b:Form {id:{fId}}) delete r', req.body, true);
}

// sync

async function sync(req, res) {
  let ass = await canvassAssignments(req.user);
  if (!ass.ready) return _403(res, "Canvasser is not assigned.");

  let last_sync = req.body.last_sync;
  if (isNaN(last_sync)) last_sync = 0;

  if (typeof req.body.nodes !== "object") return _400(res, "nodes must be an object.");
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
    return _500(res, e);
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
            if (ingeojson(turfs[t].geometry, node.longitude, node.latitude))
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

  let onodes = {};

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
      //if (i > 200) break;
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
    return _500(res, e);
  }

  return res.json({nodes: onodes});
}

// Initialize http server
const app = expressAsync(express());
app.disable('x-powered-by');
app.use(expressLogging(logger));
app.use(bodyParser.json({limit: '5mb'}));
app.use(cors({exposedHeaders: ['x-sm-oauth-url']}));

// require ip_header if config for it is set
if (!ovi_config.DEBUG && ovi_config.ip_header) {
  app.use(function (req, res, next) {
    if (!req.header(ovi_config.ip_header)) {
      console.log('Connection without '+ovi_config.ip_header+' header');
      _400(res, "Missing required header.");
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

  res.set('x-sm-oauth-url', ovi_config.sm_oauth_url);
  res.on('finish', logIt, req, res);

  req.user = {};

  // uri whitelist
  switch (req.url) {
    case '/':
    case '/poke':
    case '/canvass/':
      return next();
    default:
      break;
  }

  try {
    let u;
    if (!req.header('authorization')) return _400(res, "Missing required header.");
    u = jwt.verify(req.header('authorization').split(' ')[1], public_key);

    // verify props
    if (!u.id) return _400(res, "Your token is missing a required parameter.");
    if (u.iss !== jwt_iss) return _403(res, "Your token was issued for a different domain.");

    if (!u.email) u.email = "";
    if (!u.avatar) u.avatar = "";

    let a = await cqa('merge (a:Canvasser {id:{id}}) on match set a += {last_seen: timestamp(), name:{name}, email:{email}, avatar:{avatar}} on create set a += {created: timestamp(), last_seen: timestamp(), name:{name}, email:{email}, avatar:{avatar}} return a', u);
    if (a.data.length === 1) {
      req.user = a.data[0];
    } else return _500(res, {});

    if (req.user.locked) return _403(res, "Your account is locked.");

  } catch (e) {
    console.warn(e);
    return _401(res, "Invalid token.");
  }

  next();
});

// internal routes
app.get('/poke', poke);

// ws routes
app.get('/', towebapp);
app.get('/canvass/', towebapp);
app.post('/canvass/v1/hello', hello);
app.get('/canvass/v1/uncle', uncle);
app.get('/canvass/v1/dashboard', dashboard);
app.get('/canvass/v1/google_maps_key', google_maps_key);
app.get('/canvass/v1/canvasser/list', canvasserList);
app.get('/canvass/v1/canvasser/get', canvasserGet);
app.post('/canvass/v1/canvasser/update', canvasserUpdate);
app.post('/canvass/v1/canvasser/lock', canvasserLock);
app.post('/canvass/v1/canvasser/unlock', canvasserUnlock);
app.get('/canvass/v1/team/list', teamList);
app.post('/canvass/v1/team/create', teamCreate);
app.post('/canvass/v1/team/delete', teamDelete);
app.get('/canvass/v1/team/members/list', teamMembersList);
app.post('/canvass/v1/team/members/add', teamMembersAdd);
app.post('/canvass/v1/team/members/remove', teamMembersRemove);
app.post('/canvass/v1/team/members/wipe', teamMembersWipe);
app.get('/canvass/v1/team/turf/list', teamTurfList);
app.post('/canvass/v1/team/turf/add', teamTurfAdd);
app.post('/canvass/v1/team/turf/remove', teamTurfRemove);
app.post('/canvass/v1/team/turf/wipe', teamTurfWipe);
app.get('/canvass/v1/team/form/list', teamFormList);
app.post('/canvass/v1/team/form/add', teamFormAdd);
app.post('/canvass/v1/team/form/remove', teamFormRemove);
app.post('/canvass/v1/team/form/wipe', teamFormWipe);
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

