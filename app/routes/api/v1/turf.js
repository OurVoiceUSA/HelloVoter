
import wkx from 'wkx';
import {
  _volunteersFromCypher, volunteerAssignments,
  cqdo, valid, _400, _403, _500
} from '../../../../app/lib/utils';

const Router = require('express').Router

module.exports = Router({mergeParams: true})
.post('/turf/create', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");
  if (typeof req.body.geometry !== "object" || typeof req.body.geometry.coordinates !== "object") return _400(res, "Invalid value to parameter 'geometry'.");

  try {
    req.body.wkt = wkx.Geometry.parseGeoJSON(req.body.geometry).toEwkt().split(';')[1];
  } catch (e) {
    return _400(res, "Unable to parse geometry.");
  }

  // store geojson too as string
  req.body.geometry = JSON.stringify(req.body.geometry);
  req.body.author_id = req.user.id;

  let ref;

  try {
    // create Turf
    ref = await req.db.query('match (a:Volunteer {id:{author_id}}) create (b:Turf {id:randomUUID(), created: timestamp(), name:{name}, geometry: {geometry}, wkt:{wkt}})-[:AUTHOR]->(a) WITH b, collect(b) AS t CALL spatial.addNodes(\'turf\', t) YIELD count return b.id', req.body);
  } catch(e) {
    return _500(res, e);
  }

  let job = await req.qq.queueTask('doTurfIndexing', 'Turf {id:{turfId}}', {turfId: ref.data[0]});

  job.turfId = ref.data[0];

  return res.json(job);
})
.get('/turf/list', (req, res) => {
  let geom = false;
  if (req.query.geometry) geom = true;

  if (req.user.admin)
    return cqdo(req, res, 'match (a:Turf) return a{.id, .name, .created'+(geom?', .geometry':'')+'}');
  else
    return cqdo(req, res, 'match (v:Volunteer {id:{id}}) optional match (v)-[:ASSIGNED]-(t:Turf) with v, t as dturf optional match (v)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(t:Turf) with v, dturf + collect(t) as turf unwind turf as t call spatial.intersects("turf", t.wkt) yield node return node{.id, .name, .created'+(geom?', .geometry':'')+'}', req.user);
})
.get('/turf/get', (req, res) => {
  if (!valid(req.query.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Turf {id:{turfId}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (:Volunteer {id:{id}})-[:ASSIGNED]-(a:Turf {id:{turfId}}) return a UNION match (:Volunteer {id:{id}})-[:ASSIGNED]-(:Team)-[:ASSIGNED]-(a:Turf {id:{turfId}}) return a', req.query);
  }
})
.get('/turf/list/byposition', (req, res) => {
  req.query.longitude = parseFloat(req.query.longitude);
  req.query.latitude = parseFloat(req.query.latitude);
  if (isNaN(req.query.longitude) || isNaN(req.query.latitude)) return _400(res, "Invalid value to parameters 'longitude' and 'latitude'.");

  // TODO: if (req.user.admin) -- append a match (v:Volunteer) that's assigned to that node somehow
  return cqdo(req, res, 'call spatial.intersects("turf", {longitude: {longitude}, latitude: {latitude}}) yield node return node', req.query);
})
.get('/turf/assigned/team/list', (req, res) => {
  if (!valid(req.query.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turfId}})-[:ASSIGNED]-(b:Team) return b', req.query, true);
})
.post('/turf/assigned/team/add', (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.teamId)) return _400(res, "Invalid value to parameter 'turfId' or 'teamId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turfId}}), (b:Team {id:{teamId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
})
.post('/turf/assigned/team/remove', (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.teamId)) return _400(res, "Invalid value to parameter 'turfId' or 'teamId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turfId}})-[r:ASSIGNED]-(b:Team {id:{teamId}}) delete r', req.body, true);
})
.get('/turf/assigned/volunteer/list', async (req, res) => {
  if (!valid(req.query.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");

  let volunteers;

  try {
    volunteers = await _volunteersFromCypher(req, 'match (a:Turf {id:{turfId}})-[:ASSIGNED]-(b:Volunteer) return b', req.query, true);
  } catch (e) {
    return _500(res, e)
  }

  return res.json(volunteers);
})
.post('/turf/assigned/volunteer/add', async (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'turfId' or 'vId'.");
  if (!req.user.admin) return _403(res, "Permission denied.");

  if (req.body.turfId === 'auto')
    return cqdo(req, res, "match (a:Volunteer {id:{vId}}) set a.autoturf=true", req.body, true);

  if (!req.body.override) {
    try {
      let ret;

      ret = await req.db.query('match (a:Volunteer {id:{vId}}) return a', req.body);
      let c = ret.data[0];

      ret = await req.db.query('match (a:Turf {id:{turfId}}) return a', req.body);
      let t = ret.data[0];

      // TODO: config option for whether or not we care...
      //if (!ingeojson(JSON.parse(t.geometry), c.longitude, c.latitude)) return _400(res, "Volunteer location is not inside that turf.");
    } catch (e) {
      return _500(res, e);
    }
  }

  return cqdo(req, res, 'match (a:Turf {id:{turfId}}), (b:Volunteer {id:{vId}}) merge (a)-[:ASSIGNED]->(b)', req.body);
})
.post('/turf/assigned/volunteer/remove', async (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'turfId' or 'vId'.");

  if (req.body.turfId === 'auto')
    return cqdo(req, res, "match (a:Volunteer {id:{vId}}) set a.autoturf=null", req.body, true);

  return cqdo(req, res, 'match (a:Turf {id:{turfId}})-[r:ASSIGNED]-(b:Volunteer {id:{vId}}) delete r', req.body, true);
})
.post('/turf/delete', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!valid(req.body.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");

  try {
    await req.db.query('match (a:Turf {id:{turfId}}) detach delete a', req.body);
  } catch(e) {
    return _500(res, e);
  }

  return res.json({});
});
