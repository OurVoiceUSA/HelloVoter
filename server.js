
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
import os from 'os';
import {ingeojson, asyncForEach, us_states} from 'ourvoiceusa-sdk-js';
import circleToPolygon from 'circle-to-polygon';
import wkx from 'wkx';
import queue from 'bull';
import neo4j from 'neo4j-driver';
import BoltAdapter from 'node-neo4j-bolt-adapter';
import * as secrets from "docker-secrets-nodejs";

const ovi_config = {
  server_port: getConfig("server_port", false, 8080),
  ip_header: getConfig("client_ip_header", false, null),
  neo4j_host: getConfig("neo4j_host", false, 'localhost'),
  neo4j_user: getConfig("neo4j_user", false, 'neo4j'),
  neo4j_pass: getConfig("neo4j_pass", false, 'neo4j'),
  redis_url: getConfig("redis_url", false, null),
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

// bull queue
var nq = new queue('neo4j', ovi_config.redis_url);

async function doTurfCreate(args) {
  await cqa('call spatial.addPointLayerXY({turfId}, "lng", "lat")', args);

  // add Address nodes within Turf spatial to index

  // NOTE: passing "args" cqa() to a call within an apoc call has sytax issues;
  //       since "turfId" isn't from user input, so we're OK to inject it as a string
  let ref = await cqa('call apoc.periodic.iterate("match (a:Turf {id:\\"'+args.turfId+'\\"}) call spatial.intersects(\\"address\\", a.wkt) yield node with collect(node) as nodes return nodes", "call spatial.addNodes(\\"'+args.turfId+'\\", nodes) yield count return count", {iterateList:true}) yield wasTerminated')

  // not enough heap space on the match can result in an OOM - apoc catches it for us and yields a termination flag
  // if this happens, mark the job as failed
  if (ref.data[0] === true) throw new Error("apoc.periodic.iterate() yielded 'wasTerminated: true'");

  return ref;
}

// async'ify neo4j
const authToken = neo4j.auth.basic(ovi_config.neo4j_user, ovi_config.neo4j_pass);
const db = new BoltAdapter(neo4j.driver('bolt://'+ovi_config.neo4j_host, authToken));

// database connect
cqa('return timestamp()').catch((e) => {console.error("Unable to connect to database."); process.exit(1)}).then(() => {
  doDbInit();
});

async function doDbInit() {
  let start = new Date().getTime();
  console.log("doDbInit() started @ "+start);

  try {
    if (!ovi_config.redis_url) throw new Error("REDIS_URL is not set");

    let cpus = os.cpus().length;

    // community edition of neo4j limits CPUs to 4
    let ref = await cqa('call dbms.components() yield edition');
    if (ref.data[0] !== 'enterprise' && cpus > 4) cpus = 4;

    // limit job queue to half the CPUs available to neo4j so jobs don't grind the database to a halt
    nq.process((cpus/2), async (job) => {
      let ret;
      switch (job.data.task) {
        case 'turfCreate':
          ret = await doTurfCreate(job.data.input);
          break;
        default:
          throw new Error("Undefined task "+job.data.task);
      }
      return Promise.resolve(ret);
    });
  } catch (e) {
    console.warn("Unable to setup bull job processor queue due to the error below. This will poorly affect application response times on large databases.");
    console.warn(e);
  }

  // TODO: only call warmup if mem > dbsize
  try {
    await cqa('call apoc.warmup.run()');
  } catch (e) {
    console.warn("Call to APOC warmup failed.");
    console.warn(e)
  }

  await cqa('create constraint on (a:Volunteer) assert a.id is unique');
  await cqa('create constraint on (a:Team) assert a.name is unique');
  await cqa('create constraint on (a:Turf) assert a.name is unique');
  await cqa('create constraint on (a:Region) assert a.region is unique');
  await cqa('create constraint on (a:Form) assert a.id is unique');
  await cqa('create constraint on (a:Question) assert a.key is unique');
  await cqa('create constraint on (a:Address) assert a.id is unique');
  await cqa('create constraint on (a:Unit) assert a.id is unique');
  await cqa('create constraint on (a:Survey) assert a.id is unique');
  if (!spatialLayerExists("turf")) try {await cqa('call spatial.addWKTLayer("turf", "wkt")');} catch (e) {}
  if (!spatialLayerExists("region")) try {await cqa('call spatial.addWKTLayer("region", "wkt")');} catch (e) {}
  if (!spatialLayerExists("address")) try {await cqa('call spatial.addPointLayerXY("address", "lng", "lat");');} catch (e) {}
  if (!spatialLayerExists("volunteer")) try {await cqa('call spatial.addPointLayerXY("volunteer", "homelng", "homelat");');} catch (e) {}

  // regions with no shapes
  delete us_states.FM;
  delete us_states.MH;
  delete us_states.PW;

  // create a region layer for each item in us_states
  await asyncForEach(Object.keys(us_states), async (state) => {
    try {
      let region = 'region_'+state.toLowerCase();
      let ref = await cqa('match (a {layer:{region}})-[:LAYER]-(:ReferenceNode {name:"spatial_root"}) return a', {region: region});
      if (ref.data.length === 0) {
        console.log("Creating region for "+state);
        let res = await fetch('https://raw.githubusercontent.com/OurVoiceUSA/districts/gh-pages/states/'+state+'/shape.geojson');
        let geometry = await res.json();
        let wkt = wkx.Geometry.parseGeoJSON(geometry).toEwkt().split(';')[1];
        await cqa('call spatial.addPointLayerXY({region}, "lng", "lat");', {region: region});
        await cqa('create (a:Region {name:{state}, region:{region}, geometry: {geometry}, wkt:{wkt}}) with collect(a) as nodes call spatial.addNodes("region", nodes) yield count return count', {state: state, region: region, geometry: JSON.stringify(geometry), wkt: wkt});
      }
    } catch (e) {
      console.warn(e);
    }
  });

  let finish = new Date().getTime();
  console.log("doDbInit() finished @ "+finish+" after "+(finish-start)+" milliseconds");
}

async function spatialLayerExists(layer) {
  let ref = await cqa('match (a {layer:{layer}})-[:LAYER]-(:ReferenceNode {name:"spatial_root"}) return count(a)', {layer: layer});
  if (ref.data[0] === 0) return false;
  return true;
}

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

async function volunteerCanSee(ida, idb) {
  if (ida === idb) return true;
  if (sameTeam(ida, idb)) return true;
  if (onMyTurf(ida, idb)) return true;
  return false;
}

async function onMyTurf(ida, idb) {
  try {
    let ref = await cqa('match (a:Volunteer {id:{ida}})-[:MEMBERS {leader:true}]-(:Team)-[]-(t:Turf) where t.wkt is not null call spatial.intersects("volunteer", t.wkt) yield node where node.id = {idb} return node UNION match (a:Volunteer {id:{ida}})-[:MEMBERS {leader:true}]-(:Team)-[:MEMBERS]-(b:Volunteer {id:{idb}}) return b as node', {ida: ida, idb: idb});
    if (ref.data.length > 0) return true;
  } catch (e) {
    console.warn(e);
  }
  return false;
}

async function sameTeam(ida, idb) {
  try {
    let ref = await cqa('match (a:Volunteer {id:{ida}})-[:MEMBERS]-(:Team)-[:MEMBERS]-(b:Volunteer {id:{idb}}) return b', {ida: ida, idb: idb});
    if (ref.data.length > 0) return true;
  } catch (e) {
    console.warn(e);
  }

  return false;
}

async function volunteerAssignments(user) {
  let ref;
  let obj = {
    ready: false,
    direct: false,
    turf: [],
    teams: [],
    teamperms: [],
    forms: [],
  };

  try {
    // direct assignment to a form
    ref = await cqa('match (a:Volunteer {id:{id}}) optional match (a)-[:ASSIGNED]-(b:Form) optional match (a)-[:ASSIGNED]-(c:Turf) return collect(distinct(b)), collect(distinct(c))', user);
    if (user.autoturf || ref.data[0][0].length > 0 || ref.data[0][1].length) {
      obj.forms = obj.forms.concat(ref.data[0][0]);
      obj.turf = obj.turf.concat(ref.data[0][1]);
      obj.direct = true;

      if (user.autoturf && user.homelng && user.homelat) {
        obj.turf = [{id: 'auto', geometry: circleToPolygon([user.homelng,user.homelat],1000)}];
      }
    }

    // assingment to form/turf via team, but only bother checking if not directly assigned
    if (!obj.direct) {
      ref = await cqa('match (a:Volunteer {id:{id}}) optional match (a)-[r:MEMBERS]-(b:Team) optional match (b)-[:ASSIGNED]-(c:Turf) optional match (d:Form)-[:ASSIGNED]-(b) return collect(distinct(b)), collect(distinct(c)), collect(distinct(d)), collect(distinct(r))', user);
      if (ref.data[0][0].length > 0 || ref.data[0][1].length > 0 || ref.data[0][2].length > 0) {
        obj.teams = obj.teams.concat(ref.data[0][0]);
        obj.turf = obj.turf.concat(ref.data[0][1]);
        obj.forms = obj.forms.concat(ref.data[0][2]);
        obj.teamperms = obj.teamperms.concat(ref.data[0][3]);
        // iterate through teamperms to see if this volunteer is a leader
        for (let i in obj.teamperms) {
          if (obj.teamperms[i].leader === true) obj.leader = true;
        }
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
  res.redirect(ovi_config.wabase+'/HelloVoterHQ/'+(host?'?server='+host:''));
}

// they say that time's supposed to heal ya but i ain't done much healin'

async function hello(req, res) {
  let lng = req.body.longitude;
  let lat = req.body.latitude;

  let msg = "Awaiting assignment";
  let ass = await volunteerAssignments(req.user);

  try {
    // if there are no admins, make this one an admin
    let ref = await cqa('match (a:Volunteer {admin:true}) return count(a)');
    if (ref.data[0] === 0) {
      await cqa('match (a:Volunteer {id:{id}}) set a.admin=true', req.user);
      req.user.admin = true;
    }

    // Butterfly in the sky, I can go twice as high.
    if (req.user.admin === true) ass.admin = true;

    // web browser doesn't send this
    if (lat && lng) 
      await cqa('match (a:Volunteer {id:{id}}) set a.longitude={lng}, a.latitude={lat}', {id: req.user.id, lng: lng, lat: lat});
  } catch (e) {
    return _500(res, e);
  }

  if (ass.ready)
    msg = "You are assigned turf and ready to volunteer!";

  return res.json({msg: msg, data: ass});
}

function uncle(req, res) {
  return res.json({name: "Bob"});
}

async function dashboard(req, res) {
  try {
    if (req.user.admin === true) return res.json({
      volunteers: (await cqa('match (a:Volunteer) return count(a)')).data[0],
      teams: (await cqa('match (a:Team) return count(a)')).data[0],
      turfs: (await cqa('match (a:Turf) return count(a)')).data[0],
      questions: (await cqa('match (a:Question) return count(a)')).data[0],
      forms: (await cqa('match (a:Form) return count(a)')).data[0],
      addresses: (await cqa('match (a:Address) return count(a)')).data[0],
      dbsize: (await cqa('CALL apoc.monitor.store() YIELD totalStoreSize return totalStoreSize')).data[0],
      version: version,
    });
    else {
      let ass = await volunteerAssignments(req.user);
      return res.json({
        volunteers: (await cqa('match (a:Volunteer {id:{id}})-[:MEMBERS {leader:true}]-(:Team)-[]-(t:Turf) where t.wkt is not null call spatial.intersects("volunteer", t.wkt) yield node return node UNION match (a:Volunteer {id:{id}}) return a as node UNION match (a:Volunteer {id:{id}})-[:MEMBERS]-(:Team)-[:MEMBERS]-(c:Volunteer) return distinct(c) as node', req.user)).data.length,
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
  let ass = await volunteerAssignments(req.user);
  if (ass.ready || req.user.admin) return res.json({google_maps_key: ovi_config.google_maps_key });
  else return _401(res, "No soup for you");
}

// volunteers

// get the volunteers from the given query, and populate relationships

async function _volunteersFromCypher(query, args) {
  let volunteers = [];

  let ref = await cqa(query, args)
  for (let i in ref.data) {
    let c = ref.data[i];
    c.ass = await volunteerAssignments(c);
    volunteers.push(c);
  }

  return volunteers;
}

async function volunteerList(req, res) {
  let volunteers = [];

  try {
    let ref;

    if (req.user.admin)
      volunteers = await _volunteersFromCypher('match (a:Volunteer) return a');
    else
      volunteers = await _volunteersFromCypher('match (a:Volunteer {id:{id}})-[:MEMBERS {leader:true}]-(:Team)-[]-(t:Turf) where t.wkt is not null call spatial.intersects("volunteer", t.wkt) yield node return node UNION match (a:Volunteer {id:{id}})-[:MEMBERS]-(:Team)-[:MEMBERS]-(c:Volunteer) return distinct(c) as node UNION match (a:Volunteer {id:{id}}) return a as node', req.user);
  } catch (e) {
    return _500(res, e);
  }

  return res.json(volunteers);
}

async function volunteerGet(req, res) {
  if (!req.user.admin && req.query.id !== req.user.id && !await volunteerCanSee(req.user.id, req.query.id)) return _403(res, "Permission denied.");

  let volunteers = [];

  try {
    volunteers = await _volunteersFromCypher('match (a:Volunteer {id:{id}}) return a', req.query);
  } catch (e) {
    return _500(res, e);
  }

  return res.json(volunteers[0]);
}

async function volunteerUpdate(req, res) {
  // TODO: need to validate input, and only do updates based on what was posted
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");

  if (!req.user.admin && req.body.id !== req.user.id && !await onMyTurf(req.user.id, req.body.id)) return _403(res, "Permission denied.");

  // can't update your location if your turf is set to auto
  if (req.body.id === req.user.id && req.user.autoturf) return _403(res, "Permission denied.");

  // TODO: parameterize this
  req.body.wkt = "POINT("+req.body.lng+" "+req.body.lat+")";

  try {
    await cqa('match (a:Volunteer {id:{id}}) set a.homeaddress={address}, a.homelat={lat}, a.homelng={lng}, a.wkt={wkt}', req.body);
  } catch (e) {
    return _500(res, e);
  }

  return cqdo(req, res, 'match (a:Volunteer {id:{id}}) where not (a)<-[:RTREE_REFERENCE]-() with collect(a) as nodes call spatial.addNodes("volunteer", nodes) yield count return count', req.body);
}

async function volunteerLock(req, res) {
  if (req.body.id === req.user.id) return _403(res, "You can't lock yourself.");

  if (!req.user.admin && !await onMyTurf(req.user.id, req.body.id))
    return _403("Permission denied.");

  try {
    let ref = await cqa("match (a:Volunteer {id:{id}}) return a", req.body);
    if (ref.data[0] && ref.data[0].admin === true)
      return _403(res, "Permission denied.");
  } catch(e) {
    return _500(res, e);
  }

  return cqdo(req, res, 'match (a:Volunteer {id:{id}}) set a.locked=true', req.body);
}

async function volunteerUnlock(req, res) {
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");
  if (req.user.admin || await onMyTurf(req.user.id, req.body.id))
    return cqdo(req, res, 'match (a:Volunteer {id:{id}}) remove a.locked', req.body);
  return _403("Permission denied.");
}

// teams

function teamList(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Team) return a');
  else
    return cqdo(req, res, 'match (a:Volunteer {id:{id}})-[:MEMBERS]-(b:Team) return b', req.user);
}

function teamGet(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Team {id:{teamId}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (:Volunteer {id:{id}})-[:MEMBERS]-(a:Team {id:{teamId}}) return a', req.query);
  }
}

function teamCreate(req, res) {
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");

  req.body.teamId = uuidv4();
  req.body.author_id = req.user.id;

  return cqdo(req, res, 'match (a:Volunteer {id:{author_id}}) create (b:Team {id:{teamId}, created: timestamp(), name:{name}})-[:CREATOR]->(a)', req.body, true);
}

function teamDelete(req, res) {
  if (!valid(req.body.teamId)) return _400(res, "Invalid value to parameter 'teamId'.");
  return cqdo(req, res, 'match (a:Team {id:{teamId}}) detach delete a', req.body, true);
}

async function teamMembersList(req, res) {
  if (!valid(req.query.teamId)) return _400(res, "Invalid value to parameter 'teamId'.");

  let volunteers = [];

  try {
    if (req.user.admin)
      volunteers = await _volunteersFromCypher('match (a:Volunteer)-[:MEMBERS]-(b:Team {id:{teamId}}) return a', req.query);
    else {
      req.query.id = req.user.id;
      volunteers = await _volunteersFromCypher('match (a:Volunteer {id:{id}})-[:MEMBERS]-(b:Team {id:{teamId}}) optional match (b)-[:MEMBERS]-(c:Volunteer) return distinct(c)', req.query);
    }
  } catch (e) {
    return _500(res, e);
  }

  return res.json(volunteers);
}

async function teamMembersAdd(req, res) {
  if (!valid(req.body.teamId) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'teamId' or 'cId'.");
  if (req.user.admin || (await volunteerIsLeader(req.user.id, req.body.teamId) && await onMyTurf(req.user.id, req.body.cId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{cId}}), (b:Team {id:{teamId}}) merge (b)-[:MEMBERS]->(a)', req.body);
  return _403(res, "Permission denied.");
}

async function volunteerIsLeader(id, teamId) {
  try {
    let ref = await cqa('match (:Volunteer {id:{id}})-[:MEMBERS {leader:true}]-(a:Team {id:{teamId}}) return a', {id: id, teamId: teamId})
    if (ref.data.length > 0) return true;
  } catch (e) {
    console.warn(e);
  }
  return false;
}

async function teamMembersRemove(req, res) {
  if (!valid(req.body.teamId) || valid(!req.body.cId)) return _400(res, "Invalid value to parameter 'teamId' or 'cId'.");
  if (req.user.admin || (await volunteerIsLeader(req.user.id, req.body.teamId) && await onMyTurf(req.user.id, req.body.cId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{cId}})-[r:MEMBERS]-(b:Team {id:{teamId}}) delete r', req.body)
  return _403(res, "Permission denied.");
}

async function teamMembersPromote(req, res) {
  if (!valid(req.body.teamId) || valid(!req.body.cId)) return _400(res, "Invalid value to parameter 'teamId' or 'cId'.");
  if (req.user.admin || (await volunteerIsLeader(req.user.id, req.body.teamId) && await onMyTurf(req.user.id, req.body.cId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{cId}})-[r:MEMBERS]-(b:Team {id:{teamId}}) set r.leader=true', req.body);
  return _403(res, "Permission denied.");
}

async function teamMembersDemote(req, res) {
  if (!valid(req.body.teamId) || valid(!req.body.cId)) return _400(res, "Invalid value to parameter 'teamId' or 'cId'.");
  if (req.user.admin || (await volunteerIsLeader(req.user.id, req.body.teamId) && await onMyTurf(req.user.id, req.body.cId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{cId}})-[r:MEMBERS]-(b:Team {id:{teamId}}) set r.leader=null', req.body);
  return _403(res, "Permission denied.");
}

function teamTurfList(req, res) {
  if (!valid(req.query.teamId)) return _400(res, "Invalid value to parameter 'teamId'.");
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Turf)-[:ASSIGNED]-(b:Team {id:{teamId}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (a:Turf)-[:ASSIGNED]-(b:Team {id:{teamId}})-[:MEMBERS]-(c:Volunteer {id:{id}}) return a', req.query);
  }
}

function turfGet(req, res) {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Turf {id:{turfId}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (:Volunteer {id:{id}})-[:ASSIGNED]-(a:Turf {id:{turfId}}) return a UNION match (:Volunteer {id:{id}})-[:ASSIGNED]-(:Team)-[:ASSIGNED]-(a:Turf {id:{turfId}}) return a', req.query);
  }
}

function teamTurfAdd(req, res) {
  if (!valid(req.body.teamId) || !valid(req.body.turformId)) return _400(res, "Invalid value to parameter 'teamId' or 'turformId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turformId}}), (b:Team {id:{teamId}}) merge (b)-[:ASSIGNED]->(a)', req.body, true);
}

function teamTurfRemove(req, res) {
  if (!valid(req.body.teamId) || valid(!req.body.turformId)) return _400(res, "Invalid value to parameter 'teamId' or 'turformId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turformId}})-[r:ASSIGNED]-(b:Team {id:{teamId}}) delete r', req.body, true);
}

function teamFormList(req, res) {
  if (!valid(req.query.teamId)) return _400(res, "Invalid value to parameter 'teamId'.");
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Form)-[:ASSIGNED]-(b:Team {id:{teamId}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (a:Form)-[:ASSIGNED]-(b:Team {id:{teamId}})-[:MEMBERS]-(c:Volunteer {id:{id}}) return a', req.query);
  }
}

function teamFormAdd(req, res) {
  if (!valid(req.body.teamId) || !valid(req.body.formId)) return _400(res, "Invalid value to parameter 'teamId' or 'formId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}}), (b:Team {id:{teamId}}) merge (b)-[:ASSIGNED]->(a)', req.body, true);
}

function teamFormRemove(req, res) {
  if (!valid(req.body.teamId) || valid(!req.body.formId)) return _400(res, "Invalid value to parameter 'teamId' or 'formId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}})-[r:ASSIGNED]-(b:Team {id:{teamId}}) delete r', req.body, true);
}

// turf

function turfList(req, res) {
  let geom = false;
  if (req.query.geometry) geom = true;

  if (req.user.admin)
    return cqdo(req, res, 'match (a:Turf) return a{.id, .name, .created'+(geom?', .geometry':'')+'}');
  else
    return cqdo(req, res, 'match (a:Volunteer {id:{id}})-[:MEMBERS]-(b:Team)-[:ASSIGNED]-(c:Turf) return c UNION match (a:Volunteer {id:{id}})-[:ASSIGNED]-(c:Turf) return c{.id, .name, .created'+(geom?', .geometry':'')+'}', req.user);
}

async function turfCreate(req, res) {
  if (!req.user.admin) return 403(res, "Permission denied.");
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");
  if (typeof req.body.geometry !== "object" || typeof req.body.geometry.coordinates !== "object") return _400(res, "Invalid value to parameter 'geometry'.");

  try {
    req.body.wkt = wkx.Geometry.parseGeoJSON(req.body.geometry).toEwkt().split(';')[1];
  } catch (e) {
    return _500(res, e);
  }

  // store geojson too as string
  req.body.geometry = JSON.stringify(req.body.geometry);

  req.body.turfId = uuidv4();
  req.body.author_id = req.user.id;

  try {
    // create Turf
    await cqa('match (a:Volunteer {id:{author_id}}) create (b:Turf {id:{turfId}, created: timestamp(), name:{name}, geometry: {geometry}, wkt:{wkt}})-[:AUTHOR]->(a) WITH collect(b) AS t CALL spatial.addNodes(\'turf\', t) YIELD count return count', req.body);
  } catch(e) {
    return _500(res, e);
  }

  let job;

  try {
    // enqueue job to process turf
    job = await nq.add({
      task: 'turfCreate',
      input: req.body,
    });
  } catch (e) {
    console.warn(e);
    console.log("Unable to enqueue job, attempting it on the main worker thread");
    job = {id: 0};
    await doTurfCreate(req.body);
  }

  return res.json({jobId: job.id});
}

async function turfDelete(req, res) {
  if (!req.user.admin) return 403(res, "Permission denied.");
  if (!valid(req.body.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");
  
  try {
    await cqa('match (a:Turf {id:{turfId}}) detach delete a', req.body);
    await cqa('call spatial.removeLayer({turfId})', req.body);
  } catch(e) {
    return _500(res, e);
  }

  return res.json({});
}

function turfAssignedTeamList(req, res) {
  if (!valid(req.query.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turfId}})-[:ASSIGNED]-(b:Team) return b', req.query, true);
}

function turfAssignedTeamAdd(req, res) {
  if (!valid(req.body.turfId) || !valid(req.body.teamId)) return _400(res, "Invalid value to parameter 'turfId' or 'teamId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turfId}}), (b:Team {id:{teamId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function turfAssignedTeamRemove(req, res) {
  if (!valid(req.body.turfId) || !valid(req.body.teamId)) return _400(res, "Invalid value to parameter 'turfId' or 'teamId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turfId}})-[r:ASSIGNED]-(b:Team {id:{teamId}}) delete r', req.body, true);
}

async function turfAssignedVolunteerList(req, res) {
  if (!valid(req.query.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");

  let volunteers;

  try {
    volunteers = await _volunteersFromCypher('match (a:Turf {id:{turfId}})-[:ASSIGNED]-(b:Volunteer) return b', req.query, true);
  } catch (e) {
    return _500(res, e)
  }

  return res.json(volunteers);
}

async function turfAssignedVolunteerAdd(req, res) {
  if (!valid(req.body.turfId) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'turfId' or 'cId'.");
  if (!req.user.admin) return _403(res, "Permission denied.");

  if (req.body.turfId === 'auto')
    return cqdo(req, res, "match (a:Volunteer {id:{cId}}) set a.autoturf=true", req.body, true);

  if (!req.body.override) {
    try {
      let ret;

      ret = await cqa('match (a:Volunteer {id:{cId}}) return a', req.body);
      let c = ret.data[0];

      ret = await cqa('match (a:Turf {id:{turfId}}) return a', req.body);
      let t = ret.data[0];

      // TODO: config option for whether or not we care...
      //if (!ingeojson(JSON.parse(t.geometry), c.longitude, c.latitude)) return _400(res, "Volunteer location is not inside that turf.");
    } catch (e) {
      return _500(res, e);
    }
  }

  return cqdo(req, res, 'match (a:Turf {id:{turfId}}), (b:Volunteer {id:{cId}}) merge (a)-[:ASSIGNED]->(b)', req.body);
}

function turfAssignedVolunteerRemove(req, res) {
  if (!valid(req.body.turfId) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'turfId' or 'cId'.");

  if (req.body.turfId === 'auto')
    return cqdo(req, res, "match (a:Volunteer {id:{cId}}) set a.autoturf=null", req.body, true);

  return cqdo(req, res, 'match (a:Turf {id:{turfId}})-[r:ASSIGNED]-(b:Volunteer {id:{cId}}) delete r', req.body, true);
}

// form

async function formGet(req, res) {
  let ass = await volunteerAssignments(req.user);
  if (!req.user.admin && !idInArrObj(ass.forms, req.query.id)) return _403(res, "Volunteer is not assigned to this form.");

  let form = {};

  try {
    let a = await cqa('match (a:Form {id:{formId}})-[:AUTHOR]-(b:Volunteer) return a,b', req.query);
    form = a.data[0][0];
    form.author_id = a.data[0][1].id;
    form.author = a.data[0][1].name;
    form.questions = {};
    let b = await cqa('match (a:Question)-[:ASSIGNED]-(b:Form {id:{formId}}) return a', req.query);
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
    return cqdo(req, res, 'match (a:Volunteer {id:{id}})-[:ASSIGNED]-(b:Team)-[:ASSIGNED]-(c:Form) return c UNION match (a:Volunteer {id:{id}})-[:ASSIGNED]-(c:Form) return c', req.user)
}

async function formCreate(req, res) {
  if (!valid(req.body.name) || !valid(req.body.questions) || !valid(req.body.questions_order) ||
    typeof req.body.questions !== "object" || typeof req.body.questions_order !== "object")
    return _400(res, "Invalid value to parameter 'name' or 'questions' or 'questions_order'.");

  req.body.formId = uuidv4();
  req.body.author_id = req.user.id;

  try {
    await cqa('match (a:Volunteer {id:{author_id}}) create (b:Form {created: timestamp(), updated: timestamp(), id:{formId}, name:{name}, questions_order:{questions_order}, version:1})-[:AUTHOR]->(a)', req.body);

    // question is an object of objects, whos schema is; key: {label: , optional: , type: }
    Object.keys(req.body.questions).forEach(async (key) => {
      let q = req.body.questions[key];
      q.key = key;
      q.author_id = req.user.id;
      q.formId = req.body.formId;
      await cqa('match (a:Volunteer {id:{author_id}}) match (b:Form {id:{formId}}) create (b)<-[:ASSIGNED]-(c:Question {key:{key}, label:{label}, optional:{optional}, type:{type}})-[:AUTHOR]->(a)', q);
    });
  } catch (e) {
    return _500(res, e);
  }

  return res.json({id: req.body.formId});
}

function formDelete(req, res) {
  if (!valid(req.body.formId)) return _400(res, "Invalid value to parameter 'formId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}}) detach delete a', req.body, true);
}

function formAssignedTeamList(req, res) {
  if (!valid(req.query.formId)) return _400(res, "Invalid value to parameter 'formId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}})-[:ASSIGNED]-(b:Team) return b', req.query, true);
}

function formAssignedTeamAdd(req, res) {
  if (!valid(req.body.formId) || !valid(req.body.teamId)) return _400(res, "Invalid value to parameter 'formId' or 'teamId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}}), (b:Team {id:{teamId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function formAssignedTeamRemove(req, res) {
  if (!valid(req.body.formId) || !valid(req.body.teamId)) return _400(res, "Invalid value to parameter 'formId' or 'teamId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}})-[r:ASSIGNED]-(b:Team {id:{teamId}}) delete r', req.body, true);
}

async function formAssignedVolunteerList(req, res) {
  if (!valid(req.query.formId)) return _400(res, "Invalid value to parameter 'formId'.");

  let volunteers;

  try {
    volunteers = await _volunteersFromCypher('match (a:Form {id:{formId}})-[:ASSIGNED]-(b:Volunteer) return b', req.query, true);
  } catch (e) {
    return _500(res, e)
  }

  return res.json(volunteers);
}

function formAssignedVolunteerAdd(req, res) {
  if (!valid(req.body.formId) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'formId' or 'cId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}}), (b:Volunteer {id:{cId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function formAssignedVolunteerRemove(req, res) {
  if (!valid(req.body.formId) || !valid(req.body.cId)) return _400(res, "Invalid value to parameter 'formId' or 'cId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}})-[r:ASSIGNED]-(b:Volunteer {id:{cId}}) delete r', req.body, true);
}

// question

async function questionGet(req, res) {
  if (!valid(req.query.key)) return _400(res, "Invalid value to parameter 'key'.");
  if (!req.user.admin) return _403(res, "Permission denied.");

  let q = {};

  try {
    // TODO: use cqdo() and format the code in the cypher return rather than in javascript code
    let a = await cqa('match (a:Question {key:{key}})-[:AUTHOR]-(b:Volunteer) return a,b', req.query);

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

   return cqdo(req, res, 'match (a:Volunteer {id:{author_id}}) create (b:Question {created: timestamp(), key:{key}, label:{label}, type:{type}})-[:AUTHOR]->(a)', req.body, true);
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
  if (!valid(req.body.key) || !valid(req.body.formId)) return _400(res, "Invalid value to parameter 'key' or 'formId'.");
  return cqdo(req, res, 'match (a:Question {key:{key}}), (b:Form {id:{formId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function questionAssignedRemove(req, res) {
  if (!valid(req.body.key) || !valid(req.body.formId)) return _400(res, "Invalid value to parameter 'key' or 'formId'.");
  return cqdo(req, res, 'match (a:Question {key:{key}})-[r:ASSIGNED]-(b:Form {id:{formId}}) delete r', req.body, true);
}

// sync

async function sync(req, res) {
  let ass = await volunteerAssignments(req.user);
  if (!ass.ready) return _403(res, "Volunteer is not assigned.");

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
      // TODO: link to volunteer
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
      cqa('match (a:Volunteer {id:{id}}) merge (l:Log {uri:{uri}}) merge (a)-[:HTTP {code:{code},time:timestamp(),input:{input}}]-(l)', {id: req.user.id, code: res.statusCode, uri: req.route.path, input: JSON.stringify(obj)});
    } catch (e) {}
  }

  res.set('x-sm-oauth-url', ovi_config.sm_oauth_url);
  res.on('finish', logIt, req, res);

  req.user = {};

  // uri whitelist
  switch (req.url) {
    case '/':
    case '/poke':
    case '/volunteer/':
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

    let a = await cqa('merge (a:Volunteer {id:{id}}) on match set a += {last_seen: timestamp(), name:{name}, email:{email}, avatar:{avatar}} on create set a += {created: timestamp(), last_seen: timestamp(), name:{name}, email:{email}, avatar:{avatar}} return a', u);
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
app.get('/volunteer/', towebapp);
app.post('/volunteer/v1/hello', hello);
app.get('/volunteer/v1/uncle', uncle);
app.get('/volunteer/v1/dashboard', dashboard);
app.get('/volunteer/v1/google_maps_key', google_maps_key);
app.get('/volunteer/v1/volunteer/list', volunteerList);
app.get('/volunteer/v1/volunteer/get', volunteerGet);
app.post('/volunteer/v1/volunteer/update', volunteerUpdate);
app.post('/volunteer/v1/volunteer/lock', volunteerLock);
app.post('/volunteer/v1/volunteer/unlock', volunteerUnlock);
app.get('/volunteer/v1/team/list', teamList);
app.get('/volunteer/v1/team/get', teamGet);
app.post('/volunteer/v1/team/create', teamCreate);
app.post('/volunteer/v1/team/delete', teamDelete);
app.get('/volunteer/v1/team/members/list', teamMembersList);
app.post('/volunteer/v1/team/members/add', teamMembersAdd);
app.post('/volunteer/v1/team/members/remove', teamMembersRemove);
app.post('/volunteer/v1/team/members/promote', teamMembersPromote);
app.post('/volunteer/v1/team/members/demote', teamMembersDemote);
app.get('/volunteer/v1/team/turf/list', teamTurfList);
app.post('/volunteer/v1/team/turf/add', teamTurfAdd);
app.post('/volunteer/v1/team/turf/remove', teamTurfRemove);
app.get('/volunteer/v1/team/form/list', teamFormList);
app.post('/volunteer/v1/team/form/add', teamFormAdd);
app.post('/volunteer/v1/team/form/remove', teamFormRemove);
app.get('/volunteer/v1/turf/list', turfList);
app.get('/volunteer/v1/turf/get', turfGet);
app.post('/volunteer/v1/turf/create', turfCreate);
app.post('/volunteer/v1/turf/delete', turfDelete);
app.get('/volunteer/v1/turf/assigned/team/list', turfAssignedTeamList);
app.post('/volunteer/v1/turf/assigned/team/add', turfAssignedTeamAdd);
app.post('/volunteer/v1/turf/assigned/team/remove', turfAssignedTeamRemove);
app.get('/volunteer/v1/turf/assigned/volunteer/list', turfAssignedVolunteerList);
app.post('/volunteer/v1/turf/assigned/volunteer/add', turfAssignedVolunteerAdd);
app.post('/volunteer/v1/turf/assigned/volunteer/remove', turfAssignedVolunteerRemove);
app.get('/volunteer/v1/form/get', formGet);
app.get('/volunteer/v1/form/list', formList);
app.post('/volunteer/v1/form/create', formCreate);
app.post('/volunteer/v1/form/delete', formDelete);
app.get('/volunteer/v1/form/assigned/team/list', formAssignedTeamList);
app.post('/volunteer/v1/form/assigned/team/add', formAssignedTeamAdd);
app.post('/volunteer/v1/form/assigned/team/remove', formAssignedTeamRemove);
app.get('/volunteer/v1/form/assigned/volunteer/list', formAssignedVolunteerList);
app.post('/volunteer/v1/form/assigned/volunteer/add', formAssignedVolunteerAdd);
app.post('/volunteer/v1/form/assigned/volunteer/remove', formAssignedVolunteerRemove);
app.get('/volunteer/v1/question/get', questionGet);
app.get('/volunteer/v1/question/list', questionList);
app.post('/volunteer/v1/question/create', questionCreate);
app.post('/volunteer/v1/question/delete', questionDelete);
app.get('/volunteer/v1/question/assigned/list', questionAssignedList);
app.post('/volunteer/v1/question/assigned/add', questionAssignedAdd);
app.post('/volunteer/v1/question/assigned/remove', questionAssignedRemove);
app.post('/volunteer/v1/sync', sync);

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
  console.log('volunteer-broker express');
  console.log(`Listening at http://${address}:${port}`);
});

