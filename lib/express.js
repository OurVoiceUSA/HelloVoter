
import express from 'express';
import expressLogging from 'express-logging';
import expressAsync from 'express-async-await';
import cors from 'cors';
import uuidv4 from 'uuid/v4';
import logger from 'logops';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import { ingeojson, deepCopy } from 'ourvoiceusa-sdk-js';
import circleToPolygon from 'circle-to-polygon';
import wkx from 'wkx';

import { ov_config } from './ov_config.js';
import { public_key, jwt_iss } from  './pubkey.js';
import { cqa, neo4j_db_size, neo4j_version } from './neo4j.js';
import { queueTask } from './queue.js';

var version = require('../package.json').version;

function valid(str) {
  if (!str) return false;
  return true;
}

function getClientIP(req) {
  if (ov_config.ip_header) return req.header(ov_config.ip_header);
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

function idFromArrObj(arr) {
  let ids = [];
  for (let i in arr) ids.push(arr[i].id);
  return ids;
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

function _422(res, msg) {
  return sendError(res, 422, msg);
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
  if (sameTeam(ida, idb)) return true;
  try {
    // TODO: extend to also seach for direct turf assignments with leader:true
    let ref = await cqa('match (v:Volunteer {id:{idb}}) where exists(v.location) call spatial.intersects("turf", v.location) yield node match (:Volunteer {id:{ida}})-[:MEMBERS {leader:true}]-(:Team)-[:ASSIGNED]-(node) return count(v)', {ida: ida, idb: idb});
    if (ref.data[0] > 0) return true;
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
  let obj = {
    ready: false,
    teams: [],
    turfs: [],
    forms: [],
  };

  try {
    let ref = await cqa('match (a:Volunteer {id:{id}}) optional match (a)-[r:MEMBERS]-(b:Team) with a, collect(b{.*,leader:r.leader}) as teams optional match (a)-[:ASSIGNED]-(b:Form) with a, teams, collect(b{.*,direct:true}) as dforms optional match (a)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(b:Form) with a, teams, dforms + collect(b{.*}) as forms optional match (a)-[:ASSIGNED]-(b:Turf) with a, teams, forms, collect(b{.id,.name,direct:true}) as dturf optional match (a)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(b:Turf) with a, teams, forms, dturf + collect(b{.id,.name}) as turf return teams, forms, turf', user);

    obj.teams = ref.data[0][0];
    obj.forms = ref.data[0][1];
    obj.turfs = ref.data[0][2];

    if (user.autoturf && user.location) {
      obj.turfs.push({id: 'auto', name: 'auto', direct: true});
    }

  } catch (e) {
    console.warn(e);
  }

  if (obj.turfs.length > 0 && obj.forms.length > 0)
    obj.ready = true;

  return obj;
}

// API function calls

function poke(req, res) {
  return cqdo(req, res, 'return timestamp()', false);
}

function towebapp(req, res) {
  let host = req.header('host');
  res.redirect(ov_config.wabase+'/HelloVoterHQ/'+(host?'?server='+host:''));
}

// they say that time's supposed to heal ya but i ain't done much healin'

async function hello(req, res) {

  let msg = "Awaiting assignment";
  let ass = await volunteerAssignments(req.user);
  if (ass.ready)
    msg = "You are assigned turf and ready to volunteer!";

  // if this is coming from the mobile app
  if (typeof req.body.dinfo === 'object') {
    try {
      // create query save their device info
      let dinfo_str = ['ApplicationName', 'Brand', 'BuildNumber', 'BundleId', 'Carrier', 'DeviceCountr', 'DeviceId', 'DeviceLocale', 'DeviceName', 'FontScale', 'FreeDiskStorage', 'Manufacturer', 'Model', 'ReadableVersion', 'SystemName', 'SystemVersion', 'Timezone', 'TotalDiskCapacity', 'TotalMemory', 'UniqueID', 'UserAgent', 'Version', 'Emulator', 'Tablet', 'hasNotch', 'Landscape'].map(d => d+':{'+d+'}').join(',');

      let args = deepCopy(req.body.dinfo);
      args.id = req.user.id;
      args.lng = parseFloat(req.body.longitude);
      args.lat = parseFloat(req.body.latitude);

      if (isNaN(args.lng) || isNaN(args.lat)) return _400(res, "Invalid value to parameters 'longitude' and 'latitude'.");

      // if we don't have their location, set it
      if (!req.user.location) {
        try {
          let res = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lon='+args.lng+'&lat='+args.lat);
          let n = await res.json();
          args.str = n.address.city+', '+n.address.state;
          await cqa('match (v:Volunteer {id:{id}}) set v.location = point({longitude: {lng}, latitude: {lat}}), v.locationstr = {str}', args);
        } catch (e) {
          console.warn(e);
        }
      }

      await cqa('match (a:Volunteer {id:{id}}) merge (b:Device {UniqueID:{UniqueID}}) on create set b += {created: timestamp(), updates: timestamp(), '+dinfo_str+'} on match set b += {updated: timestamp(), '+dinfo_str+'} merge (a)<-[:USED_BY]-(b) set a.position = point({longitude: {lng}, latitude: {lat}})', args);
    } catch (e) {
      return _500(res, e);
    }
  }

  return res.json({msg: msg, data: ass});
}

function uncle(req, res) {
  return res.json({name: "Bob"});
}

async function dashboard(req, res) {
  try {
    let nv = await neo4j_version();
    if (req.user.admin === true) return res.json({
      volunteers: (await cqa('match (a:Volunteer) return count(a)')).data[0],
      teams: (await cqa('match (a:Team) return count(a)')).data[0],
      turfs: (await cqa('match (a:Turf) return count(a)')).data[0],
      attributes: (await cqa('match (a:Attribute) return count(a)')).data[0],
      forms: (await cqa('match (a:Form) return count(a)')).data[0],
      addresses: (await cqa('match (a:Address) return count(a)')).data[0],
      dbsize: await neo4j_db_size(),
      version: version,
      neo4j_version: nv,
    });
    else {
      let ass = await volunteerAssignments(req.user);
      return res.json({
        volunteers: (await cqa('match (a:Volunteer {id:{id}})-[:MEMBERS {leader:true}]-(:Team)-[]-(t:Turf) where t.wkt is not null call spatial.intersects("volunteer", t.wkt) yield node return node UNION match (a:Volunteer {id:{id}}) return a as node UNION match (a:Volunteer {id:{id}})-[:MEMBERS]-(:Team)-[:MEMBERS]-(c:Volunteer) return distinct(c) as node', req.user)).data.length,
        teams: ass.teams.length,
        turfs: ass.turfs.length,
        attributes: 'N/A',
        forms: ass.forms.length,
        addresses: 'N/A',
        version: (ass.ready?version:null),
        neo4j_version: (ass.ready?nv:null),
      });
    }
  } catch (e) {
    return _500(res, e);
  }
  return res.json({});
}

async function google_maps_key(req, res) {
  let ass = await volunteerAssignments(req.user);
  if (ass.ready || req.user.admin) return res.json({google_maps_key: ov_config.google_maps_key });
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

  try {
    await cqa('match (a:Volunteer {id:{id}}) set a.locationstr={address}, a.location = point({longitude: {lng}, latitude: {lat}})', req.body);
  } catch (e) {
    return _500(res, e);
  }

  return res.json({});
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
  if (!valid(req.body.teamId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'teamId' or 'vId'.");
  if (req.user.admin || (await volunteerIsLeader(req.user.id, req.body.teamId) && await onMyTurf(req.user.id, req.body.vId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{vId}}), (b:Team {id:{teamId}}) merge (b)-[:MEMBERS]->(a)', req.body);
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
  if (!valid(req.body.teamId) || valid(!req.body.vId)) return _400(res, "Invalid value to parameter 'teamId' or 'vId'.");
  if (req.user.admin || (await volunteerIsLeader(req.user.id, req.body.teamId) && await onMyTurf(req.user.id, req.body.vId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{vId}})-[r:MEMBERS]-(b:Team {id:{teamId}}) delete r', req.body)
  return _403(res, "Permission denied.");
}

async function teamMembersPromote(req, res) {
  if (!valid(req.body.teamId) || valid(!req.body.vId)) return _400(res, "Invalid value to parameter 'teamId' or 'vId'.");
  if (req.user.admin || (await volunteerIsLeader(req.user.id, req.body.teamId) && await onMyTurf(req.user.id, req.body.vId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{vId}})-[r:MEMBERS]-(b:Team {id:{teamId}}) set r.leader=true', req.body);
  return _403(res, "Permission denied.");
}

async function teamMembersDemote(req, res) {
  if (!valid(req.body.teamId) || valid(!req.body.vId)) return _400(res, "Invalid value to parameter 'teamId' or 'vId'.");
  if (req.user.admin || (await volunteerIsLeader(req.user.id, req.body.teamId) && await onMyTurf(req.user.id, req.body.vId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{vId}})-[r:MEMBERS]-(b:Team {id:{teamId}}) set r.leader=null', req.body);
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
  if (!req.user.admin) return _403(res, "Permission denied.");
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

  let job = await queueTask('doTurfIndexing', 'Turf {id:{turfId}}', {turfId: req.body.turfId});

  return res.json(job);
}

async function turfDelete(req, res) {
  if (!req.user.admin) return 403(res, "Permission denied.");
  if (!valid(req.body.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");
  
  try {
    await cqa('match (a:Turf {id:{turfId}}) detach delete a', req.body);
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
  if (!valid(req.body.turfId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'turfId' or 'vId'.");
  if (!req.user.admin) return _403(res, "Permission denied.");

  if (req.body.turfId === 'auto')
    return cqdo(req, res, "match (a:Volunteer {id:{vId}}) set a.autoturf=true", req.body, true);

  if (!req.body.override) {
    try {
      let ret;

      ret = await cqa('match (a:Volunteer {id:{vId}}) return a', req.body);
      let c = ret.data[0];

      ret = await cqa('match (a:Turf {id:{turfId}}) return a', req.body);
      let t = ret.data[0];

      // TODO: config option for whether or not we care...
      //if (!ingeojson(JSON.parse(t.geometry), c.longitude, c.latitude)) return _400(res, "Volunteer location is not inside that turf.");
    } catch (e) {
      return _500(res, e);
    }
  }

  return cqdo(req, res, 'match (a:Turf {id:{turfId}}), (b:Volunteer {id:{vId}}) merge (a)-[:ASSIGNED]->(b)', req.body);
}

function turfAssignedVolunteerRemove(req, res) {
  if (!valid(req.body.turfId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'turfId' or 'vId'.");

  if (req.body.turfId === 'auto')
    return cqdo(req, res, "match (a:Volunteer {id:{vId}}) set a.autoturf=null", req.body, true);

  return cqdo(req, res, 'match (a:Turf {id:{turfId}})-[r:ASSIGNED]-(b:Volunteer {id:{vId}}) delete r', req.body, true);
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
    form.attributes_order = deepCopy(form.attributes);
    form.attributes = {};
    let b = await cqa('match (a:Attribute)-[:COMPILED_ON]->(b:Form {id:{formId}}) return a', req.query);
    // convert from an array of objects to an objects of objects
    b.data.forEach((q) => {
      let key = q.id;
      form.attributes[key] = q;
      delete form.attributes[key].id;
    });
    // add the user's turfs to this form
    let c = await cqa('match (t:Turf) where t.id in {turfIds} return t.geometry', {turfIds: idFromArrObj(ass.turfs)});
    form.turfs = c.data.map(t => JSON.parse(t));
    if (req.user.autoturf && req.user.location)
      form.turfs.push(circleToPolygon([req.user.location.x,req.user.location.y],1000));
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
  if (!valid(req.body.name) || !valid(req.body.attributes) || typeof req.body.attributes !== "object")
    return _400(res, "Invalid value to parameter 'name' or 'attributes'.");

  // TODO: validate every attributes exists

  req.body.author_id = req.user.id;

  try {
    // attributes property stores which order they come in as
    await cqa('match (a:Volunteer {id:{author_id}}) create (b:Form {id: randomUUID(), created: timestamp(), updated: timestamp(), name:{name}, attributes:{attributes}})-[:AUTHOR]->(a) with b unwind {attributes} as attr match (a:Attribute {id:attr}) merge (a)-[:COMPILED_ON]->(b)', req.body);
  } catch (e) {
    return _500(res, e);
  }

  return res.json({});
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
  if (!valid(req.body.formId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'formId' or 'vId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}}), (b:Volunteer {id:{vId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
}

function formAssignedVolunteerRemove(req, res) {
  if (!valid(req.body.formId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'formId' or 'vId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}})-[r:ASSIGNED]-(b:Volunteer {id:{vId}}) delete r', req.body, true);
}

// attribute

function attributeList(req, res) {
  if (req.user.admin === true)
    return cqdo(req, res, 'match (a:Attribute) return a order by a.order', {}, true);
  else
    return cqdo(req, res, `
  match (v:Volunteer {id:{id}})
  optional match (v)-[:ASSIGNED]-(f:Form) with v, collect(f) as dforms
  optional match (v)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(f:Form) with v, dforms + collect(f) as forms
  unwind forms as f
  match (a:Attribute)-[:COMPILED_ON]->(f)
  return a order by a.order
    `, req.user);
}

function attributeCreate(req, res) {
   if (!valid(req.body.name) || !valid(req.body.type)) return _400(res, "Invalid value to parameter 'name' or 'type'.");
   req.body.author_id = req.user.id;

   switch (req.body.type) {
     case 'string':
     case 'textbox':
     case 'number':
     case 'boolean':
     case 'date':
     case 'SAND':
       break;
     default: return _400(res, "Invalid value to parameter 'type'.");
   }

   return cqdo(req, res, 'match (a:Volunteer {id:{author_id}}) create (b:Attribute {id:randomUUID(), created: timestamp(), name:{name}, type:{type}})-[:AUTHOR]->(a)', req.body, true);
}

function attributeDelete(req, res) {
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");
  return cqdo(req, res, 'match (a:Attribute {id:{id}}) detach delete a', req.body, true);
}

function attributeFormList(req, res) {
  if (!valid(req.query.id)) return _400(res, "Invalid value to parameter 'id'.");
  return cqdo(req, res, 'match (a:Attribute {id:{id}})-[:COMPILED_ON]-(b:Form) return b', req.query, true);
}

function attributeFormAdd(req, res) {
  if (!valid(req.body.id) || !valid(req.body.formId)) return _400(res, "Invalid value to parameter 'key' or 'formId'.");
  return cqdo(req, res, 'match (a:Attribute {id:{id}}) with a match (b:Form {id:{formId}}) merge (a)-[:COMPILED_ON]->(b)', req.body, true);
}

function attributeFormRemove(req, res) {
  if (!valid(req.body.id) || !valid(req.body.formId)) return _400(res, "Invalid value to parameter 'key' or 'formId'.");
  return cqdo(req, res, 'match (a:Attribute {id:{id}})-[r:COMPILED_ON]-(b:Form {id:{formId}}) delete r', req.body, true);
}

async function importList(req, res) {
  return cqdo(req, res, 'match (a:ImportFile) return a order by a.created desc', {}, true);
}

async function importBegin(req, res) {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.filename)) return _400(res, "Invalid value to parameter 'filename'.");
  if (typeof req.body.attributes !== 'object') return _400(res, "Invalid value to parameter 'attributes'.");

  // TODO: validate that req.body.filename is a file name
  req.body.id = req.user.id;
  try {
    let ref = await cqa('match (a:ImportFile {filename:{filename}}) where a.submitted is not null return count(a)', req.body);
    if (ref.data[0] !== 0) return _403(res, "Import File already exists.");

    // attributes property stores which order they come in as
    await cqa('match (a:Volunteer {id:{id}}) merge (b:ImportFile {filename:{filename}}) on create set b += {id: randomUUID(), created: timestamp(), attributes: {attributes}} merge (b)-[:IMPORTED_BY]->(a) with b unwind {attributes} as attr match (a:Attribute {name:attr}) merge (b)-[:ATTRIBUTES]->(a)', req.body);
  } catch (e) {
    return _500(res, e);
  }

  return res.json({});
}

async function importAdd(req, res) {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.filename)) return _400(res, "Invalid value to parameter 'filename'.");

  try {
    // TODO: verify data[0].length matches attriutes.length+8
    // TODO: verify each attribute exists
    // convert attriutes to part of a cypher query
    let attrq = "";
    let ref = await cqa('match (a:ImportFile {filename:{filename}}) return a.attributes', req.body);
    for (let i = 0; i < ref.data[0].length; i++) {
      attrq += ',`'+ref.data[0][i]+'`:r['+(i+8)+']';
    }
    await cqa('match (a:ImportFile {filename:{filename}}) with collect(a) as lock call apoc.lock.nodes(lock) match (a:ImportFile {filename:{filename}}) unwind {data} as r merge (b:ImportRecord {id:apoc.util.md5([r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7]])}) on create set b += {pid:r[0], street:r[1], unit:r[2], city:r[3], state:r[4], zip:r[5], lng:r[6], lat:r[7]'+attrq+'} merge (b)-[:FILE]->(a)', req.body);
  } catch (e) {
    return _500(res, e);
  }

  return res.json({});
}

async function importEnd(req, res) {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.filename)) return _400(res, "Invalid value to parameter 'filename'.");

  try {
    let ref = await cqa('match (a:ImportFile {filename:{filename}}) where a.submitted is null set a.submitted = timestamp() return count(a)', req.body);
    if (ref.data[0] !== 1) return _403(res, "Import File already submitted for processing.");
  } catch (e) {
    return _500(res, e);
  }

  let job = await queueTask('doProcessImport', 'ImportFile {filename:{filename}}', {filename: req.body.filename});

  return res.json(job);
}

async function queueList(req, res) {
  return cqdo(req, res, 'match (a:QueueTask)<-[:PROCESSED_BY]-(b) return a, labels(b)[0], b{.id,.name,.filename} order by a.created desc', {}, true);
}

async function analyticsList(req, res) {
  if (!req.query.aId) return _400(res, "Invalid value to parameter 'aId'.");
  return cqdo(req, res, (req.query.turfId?'match (:Turf {id:{turfId}})<-[:WITHIN]-(:Address)':'match (:Address)')+'<-[:AT*0..1]-()<-[:RESIDENCE]-(a:Person) '+(req.query.include_null?'optional match':'match')+' (a)<-[:ATTRIBUTE_OF]-(b:PersonAttribute)-[:ATTRIBUTE_TYPE]->(:Attribute {id:{aId}}) '+(req.query.include_null?'':'where not b.value = ""')+' with distinct(b.value) as dist, count(*) as count return dist, count order by count desc', req.query, true);
}

// data for canvassing

async function peopleGetByposition(req, res) {
  let ref = {};

  req.query.longitude = parseFloat(req.query.longitude);
  req.query.latitude = parseFloat(req.query.latitude);
  if (req.query.limit) req.query.limit = parseInt(req.query.limit);
  if (req.query.dist) req.query.dist = parseInt(req.query.dist);

  if (isNaN(req.query.longitude) || isNaN(req.query.latitude)) return _400(res, "Invalid value to parameters 'longitude' and 'latitude'.");

  req.query.id = req.user.id;
  req.query.visit_status = [0,1,2];

  // non-admin limits
  if (!req.user.admin) {
    // non-admin requires formId so they can't see what's already been interacted with on this form
    if (!req.query.formId) return _400(res, "Invalid value to parameter 'formId'.");
    req.query.limit = 25; // TODO: server setting for this?
    req.query.dist = 1000; // TODO: this too?
    req.query.visit_status = [0];
  }

  // default admin limits
  if (!req.query.limit) req.query.limit = 1000;
  if (!req.query.dist) req.query.dist = 1000;

  try {
    // in rural areas this query can return zero -- retry with an order of magnatude incrasea ... twice if we have to
    let retry = 0;
    while (retry <= 2) {
      if (retry && req.query.dist <= 100000) req.query.dist *= 10;
      
      ref = await cqa(`
  match (v:Volunteer {id:{id}})
  optional match (t:Turf)-[:ASSIGNED]->(:Team)-[:MEMBERS]->(v)
    with v, collect(t.id) as tt
  optional match (t:Turf)-[:ASSIGNED]->(v)
    with v, tt + collect(t.id) as turfIds
  `+(req.user.autoturf?'optional ':'')+`match (t:Turf) where t.id in turfIds
    with v, t, turfIds
  match (a:Address) using index a:Address(position)
    where distance(a.position, point({longitude: {longitude}, latitude: {latitude}})) < {dist}
      and
        ((a)-[:WITHIN]->(t)`+(req.user.autoturf?' or distance(a.position, v.location) < 1000':'')+`)
    with a, distance(a.position, point({longitude: {longitude}, latitude: {latitude}})) as dist
    order by dist limit {limit}
  optional match (u:Unit)-[:AT]->(a)
    with a, u
  optional match (person:Person)-[:RESIDENCE]->(u)
`+((!req.user.admin&&req.query.formId)?'where not (person)<-[:VISIT_PERSON]-(:Visit)-[:VISIT_FORM]->(:Form {id:{formId}})':'')+`
  optional match (attr:Attribute)<-[:ATTRIBUTE_TYPE]-(pattr:PersonAttribute)-[:ATTRIBUTE_OF]->(person)
    with a, u, person, collect({id:attr.id, name:attr.name, value:pattr.value}) as attrs
    with a, u, collect(person{.*, attrs:attrs}) as people
`+((!req.user.admin&&req.query.formId)?'where size(people) > 0 or u is null':'')+`
`+(req.query.formId?'optional match (u)<-[:VISIT_AT]-(v:Visit)-[:VISIT_FORM]->(:Form {id:{formId}}) where v.status in {visit_status} with a, u, people, collect(v) as visits':'')+`
    with a, u{.*, people: people`+(req.query.formId?', visits: visits':'')+`} as unit order by toInteger(unit.name)
    with a, collect(unit) as units
  optional match (person:Person)-[:RESIDENCE]->(a)
`+((!req.user.admin&&req.query.formId)?'where not (person)<-[:VISIT_PERSON]-(:Visit)-[:VISIT_FORM]->(:Form {id:{formId}})':'')+`
  optional match (attr:Attribute)<-[:ATTRIBUTE_TYPE]-(pattr:PersonAttribute)-[:ATTRIBUTE_OF]->(person)
    with a, units, person, collect({id:attr.id, name:attr.name, value:pattr.value}) as attrs
    with a, units, a.position as ap, collect(person{.*, attrs: attrs}) as people
`+(req.query.formId?'optional match (a)<-[:VISIT_AT]-(v:Visit)-[:VISIT_FORM]->(:Form {id:{formId}}) where v.status in {visit_status} with a, units, ap, people, collect(v) as visits':'')+`
`+((!req.user.admin&&req.query.formId)?'where size(people) > 0 or size(units) > 0':'')+`
  return collect({address: a{longitude:ap.x,latitude:ap.y,.id,.street,.city,.state,.zip,.updated},
                  units: units, people: people`
                  +(req.query.formId?', visits: visits':'')+
      `}) as data`,
      req.query);

      if (ref.data[0].length) return res.json(ref.data[0]);

      // retry if not over limit
      retry++;
    }

  } catch (e) {
    return _500(res, e);
  }

  return res.json([]);
}

async function peopleVisitAdd(req, res) {
  return _400(res, "Not Implemented yet.");
}

async function peopleVisitUpdate(req, res) {
  let ref = {};

  if (!req.body.deviceId) return _400(res, "Invalid value to parameter 'deviceId'.");
  if (!req.body.addressId) return _400(res, "Invalid value to parameter 'addressId'.");
  if (!req.body.formId) return _400(res, "Invalid value to parameter 'formId'.");
  if (isNaN(req.body.status) || [0,1,2,3].indexOf(req.body.status) === -1) return _400(res, "Invalid value to parameter 'status'.");

  req.body.start = parseInt(req.body.start);
  req.body.end = parseInt(req.body.end);
  req.body.longitude = parseFloat(req.body.longitude);
  req.body.latitude = parseFloat(req.body.latitude);

  if (isNaN(req.body.start)) return _400(res, "Invalid value to parameter 'start'.");
  if (isNaN(req.body.end)) return _400(res, "Invalid value to parameter 'end'.");
  if (isNaN(req.body.longitude)) return _400(res, "Invalid value to parameter 'longitude'.");
  if (isNaN(req.body.latitude)) return _400(res, "Invalid value to parameter 'latitude'.");

  // TODO: make sure start and end aren't wacky (end is before start, or either is newer than now)

  // personId required if they are home or no longer live there
  if ((req.body.status === 1 || req.body.status === 3) && !req.body.personId) return _400(res, "Invalid value to parameter 'personId'.");

  // attrs is required if status is home
  if (req.body.status === 1 && typeof req.body.attrs !== 'object') return _400(res, "Invalid value to parameter 'attrs'.");

  let ass = await volunteerAssignments(req.user);
  if (!ass.ready) return _403(res, "Volunteer is not assigned.");

  // make sure formId is in ass.forms
  if (ass.forms.map(f => f.id).indexOf(req.body.formId) === -1) return _403(res, "You are not assigned this form.");

  try {
    req.body.id = req.user.id;

    ref = await cqa(`
  match (v:Volunteer {id:{id}})
  optional match (t:Turf)-[:ASSIGNED]->(:Team)-[:MEMBERS]->(v)
    with v, collect(t.id) as tt
  optional match (t:Turf)-[:ASSIGNED]->(v)
    with v, tt + collect(t.id) as turfIds
  match (t:Turf) where t.id in turfIds
  `+(req.body.personId?'match (p:Person {id:{personId}})-[r:RESIDENCE]->':'')+(req.body.unit?'(u:Unit {name:{unit}})-[:AT]->':'')+`(a:Address {id:{addressId}})-[:WITHIN]->(t)
    using index a:Address(id)
  match (d:Device {UniqueID:{deviceId}})-[:USED_BY]->(v),
    (f:Form {id:{formId}})
  create (vi:Visit {
    start: {start},
    end: {end},
    status: {status},
    uploaded: timestamp(),
    position: point({longitude: {longitude}, latitude: {latitude}})
  })
  merge (vi)-[:VISIT_DEVICE]->(d)
  merge (vi)-[:VISIT_VOLUNTEER]->(v)
  merge (vi)-[:VISIT_AT]->(`+(req.body.unit?'u':'a')+`)
  merge (vi)-[:VISIT_FORM]->(f)
`+(req.body.personId?`
  merge (vi)-[:VISIT_PERSON]->(p)
`+(req.body.status===3?`
    set r.current = null
`:`
    with vi, p
  unwind {attrs} as attr
  match (a:Attribute {id:attr.id})
  merge (p)<-[:ATTRIBUTE_OF]-(pa:PersonAttribute {value:attr.value})-[:ATTRIBUTE_TYPE]->(a)
  merge (vi)-[:VISIT_PATTR]->(pa)
`):'')+`
  return distinct(vi.id)
    `, req.body);
  } catch (e) {
    return _500(res, e);
  }

  // if nothing was returned, they had all the right params but it didn't match up with the dataset somehow
  // return the "Unprocessable Entity" http error code
  if (!ref.data) _422(res, "Query returned no data. Something went wrong with your request.");

  return res.json(ref.data);
}

// Initialize http server
export function doExpressStartup() {

  const app = expressAsync(express());
  app.disable('x-powered-by');
  app.disable('etag');
  app.use(expressLogging(logger));
  app.use(bodyParser.json({limit: '5mb'}));
  app.use(cors({exposedHeaders: ['x-sm-oauth-url']}));

  // require ip_header if config for it is set
  if (!ov_config.DEBUG && ov_config.ip_header) {
    app.use(function (req, res, next) {
      if (!req.header(ov_config.ip_header)) {
        console.log('Connection without '+ov_config.ip_header+' header');
       _400(res, "Missing required header.");
      }
      else next();
    });
  }

  // add req.user if there's a valid JWT
  app.use(async function (req, res, next) {

    if (req.method == 'OPTIONS') return next(); // skip OPTIONS requests

    res.set('x-sm-oauth-url', ov_config.sm_oauth_url);

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

  // base route def
  let base_uri = '/HelloVoterHQ/api/v1';

  // internal routes
  app.get('/poke', poke);

  // ws routes
  app.get('/', towebapp);
  app.post(base_uri+'/hello', hello);
  app.get(base_uri+'/uncle', uncle);
  app.get(base_uri+'/dashboard', dashboard);
  app.get(base_uri+'/google_maps_key', google_maps_key);
  app.get(base_uri+'/volunteer/list', volunteerList);
  app.get(base_uri+'/volunteer/get', volunteerGet);
  app.post(base_uri+'/volunteer/update', volunteerUpdate);
  app.post(base_uri+'/volunteer/lock', volunteerLock);
  app.post(base_uri+'/volunteer/unlock', volunteerUnlock);
  app.get(base_uri+'/team/list', teamList);
  app.get(base_uri+'/team/get', teamGet);
  app.post(base_uri+'/team/create', teamCreate);
  app.post(base_uri+'/team/delete', teamDelete);
  app.get(base_uri+'/team/members/list', teamMembersList);
  app.post(base_uri+'/team/members/add', teamMembersAdd);
  app.post(base_uri+'/team/members/remove', teamMembersRemove);
  app.post(base_uri+'/team/members/promote', teamMembersPromote);
  app.post(base_uri+'/team/members/demote', teamMembersDemote);
  app.get(base_uri+'/team/turf/list', teamTurfList);
  app.post(base_uri+'/team/turf/add', teamTurfAdd);
  app.post(base_uri+'/team/turf/remove', teamTurfRemove);
  app.get(base_uri+'/team/form/list', teamFormList);
  app.post(base_uri+'/team/form/add', teamFormAdd);
  app.post(base_uri+'/team/form/remove', teamFormRemove);
  app.get(base_uri+'/turf/list', turfList);
  app.get(base_uri+'/turf/get', turfGet);
  app.post(base_uri+'/turf/create', turfCreate);
  app.post(base_uri+'/turf/delete', turfDelete);
  app.get(base_uri+'/turf/assigned/team/list', turfAssignedTeamList);
  app.post(base_uri+'/turf/assigned/team/add', turfAssignedTeamAdd);
  app.post(base_uri+'/turf/assigned/team/remove', turfAssignedTeamRemove);
  app.get(base_uri+'/turf/assigned/volunteer/list', turfAssignedVolunteerList);
  app.post(base_uri+'/turf/assigned/volunteer/add', turfAssignedVolunteerAdd);
  app.post(base_uri+'/turf/assigned/volunteer/remove', turfAssignedVolunteerRemove);
  app.get(base_uri+'/form/get', formGet);
  app.get(base_uri+'/form/list', formList);
  app.post(base_uri+'/form/create', formCreate);
  app.post(base_uri+'/form/delete', formDelete);
  app.get(base_uri+'/form/assigned/team/list', formAssignedTeamList);
  app.post(base_uri+'/form/assigned/team/add', formAssignedTeamAdd);
  app.post(base_uri+'/form/assigned/team/remove', formAssignedTeamRemove);
  app.get(base_uri+'/form/assigned/volunteer/list', formAssignedVolunteerList);
  app.post(base_uri+'/form/assigned/volunteer/add', formAssignedVolunteerAdd);
  app.post(base_uri+'/form/assigned/volunteer/remove', formAssignedVolunteerRemove);
  app.get(base_uri+'/attribute/list', attributeList);
  app.post(base_uri+'/attribute/create', attributeCreate);
  app.post(base_uri+'/attribute/delete', attributeDelete);
  app.get(base_uri+'/attribute/form/list', attributeFormList);
  app.post(base_uri+'/attribute/form/add', attributeFormAdd);
  app.post(base_uri+'/attribute/form/remove', attributeFormRemove);
  app.get(base_uri+'/import/list', importList);
  app.post(base_uri+'/import/begin', importBegin);
  app.post(base_uri+'/import/add', importAdd);
  app.post(base_uri+'/import/end', importEnd);
  app.get(base_uri+'/queue/list', queueList);
  app.get(base_uri+'/analytics/list', analyticsList);
  app.get(base_uri+'/people/get/byposition', peopleGetByposition);
  app.post(base_uri+'/people/visit/add', peopleVisitAdd);
  app.post(base_uri+'/people/visit/update', peopleVisitUpdate);
  app.post(base_uri+'/people/visit/remove', peopleVisitUpdate);
  
  // Launch the server
  const server = app.listen(ov_config.server_port, () => {
    const { address, port } = server.address();
    console.log('express.js startup');
    console.log(`Listening at http://${address}:${port}`);
  });
  
}

