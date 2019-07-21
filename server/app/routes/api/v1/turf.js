
import wkx from 'wkx';
import {
  _volunteersFromCypher,
  cqdo, valid, _400, _403, _500
} from '../../../lib/utils';

import { Router } from 'express';

async function stats_by_attr(req, attrs) {
  req.query.attrs = attrs;
  let c = '';
  if (attrs) c = attrs.map((attr, idx) => 'match (p)<-[:ATTRIBUTE_OF]-(pa'+idx+':PersonAttribute)-[:ATTRIBUTE_TYPE]->(:Attribute {id:"'+attr.id+'"}) where pa'+idx+'.value '+attr.op+' "'+attr.val+'"').join(' ');
  let ref = await req.db.query(`
    match (p:Person)-[:RESIDENCE {current:true}]->()-[*0..1]-(a:Address)-[:WITHIN]->(t:Turf {id:{turfId}})
    `+c+`
    optional match (p)<-[:VISIT_PERSON]-(vi:Visit) with a, p, CASE WHEN (count(vi) > 0) THEN {visits: count(vi)} ELSE NULL END as visits
    optional match (p)<-[:VISIT_PERSON]-(rvi:Visit) where rvi.end > timestamp()-(1000*60*60*24*30) with a, p, visits, CASE WHEN (count(rvi) > 0) THEN {visits: count(rvi)} ELSE NULL END as recent_visits
    return count(distinct(a)), count(p), count(visits), count(recent_visits)`
  , req.query);
  return {
    'Total Addresses': ref.data[0][0],
    'Total People': ref.data[0][1],
    'Total People Visited': ref.data[0][2],
    'People Visited in past month': ref.data[0][3],
  };
}

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
    return cqdo(req, res, 'match (a:Turf) return a{.id, .name, .created'+(geom?', .geometry':'')+'} order by a.name');
  else
    return cqdo(req, res, 'match (v:Volunteer {id:{id}}) optional match (v)-[:ASSIGNED]-(t:Turf) with v, t as dturf optional match (v)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(t:Turf) with v, dturf + collect(t) as turf unwind turf as t call spatial.intersects("turf", t.wkt) yield node return node{.id, .name, .created'+(geom?', .geometry':'')+'} order by node.name', req.user);
})
.get('/turf/get', async (req, res) => {
  if (!valid(req.query.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");
  let ref, turf = {data: []};
  if (req.user.admin)
    ref = await req.db.query('match (a:Turf {id:{turfId}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    ref = await req.db.query('match (:Volunteer {id:{id}})-[:ASSIGNED]-(a:Turf {id:{turfId}}) return a UNION match (:Volunteer {id:{id}})-[:ASSIGNED]-(:Team)-[:ASSIGNED]-(a:Turf {id:{turfId}}) return a', req.query);
  }

  turf.data = ref.data;

  if (turf.data.length) {
    let ref = await req.db.query(`
match (t:Turf {id:{turfId}})
optional match (v:Volunteer)<-[:ASSIGNED]-(t)
  with t, count(v) as total_assigned
optional match (v:Volunteer)<-[:VISIT_VOLUNTEER]-(vi:Visit)-[:VISIT_AT]->()-[*0..1]-(:Address)-[:WITHIN]->(t)
  with t, count(distinct(v)) as total_active, total_assigned
optional match (v:Volunteer)<-[:VISIT_VOLUNTEER]-(vi:Visit)-[:VISIT_AT]->()-[*0..1]-(:Address)-[:WITHIN]->(t)
  with distinct(v.name) as active_name, t, count(distinct(vi)) as count, total_active, total_assigned order by count desc limit 1
optional match (vi:Visit)-[:VISIT_AT]->()-[*0..1]-(:Address)-[:WITHIN]->(t)
  with t, vi.end as last_touch, active_name, total_active, total_assigned order by vi.end desc limit 1
return last_touch, active_name, total_active, total_assigned`,
    req.query);
    // turf stats
    turf.data[0].stats = {
      'Last Touch': ref.data[0][0],
      'Most active volunteer': ref.data[0][1],
      'Number of active volunteers': ref.data[0][2],
      'Number of volunteers assigned': ref.data[0][3],
      'First assigned': 'N/A',
      'Stats by Attribute': {
        'total': await stats_by_attr(req),
        // TODO: include list of custom attribute chains by user preference
        // 'custom attribute value and male and born after 1980': await stats_by_attr(req, [{id: '9a912e86-3977-426a-8da0-b7fd90c8834a', op: '=', val: "Municipal"},{id: 'a0e622d2-db0a-410e-a315-52c65f678ffa', op: '=', val: "Male"},{id: '9a903e4f-66ea-4625-bacf-43abb53c6cfc', op: '>=', val: '1980'}]),
      }
    };
  }

  return res.json(turf);
})
.get('/turf/list/byposition', (req, res) => {
  req.query.longitude = parseFloat(req.query.longitude);
  req.query.latitude = parseFloat(req.query.latitude);
  req.query.dist = parseFloat(req.query.dist);
  if (isNaN(req.query.longitude) || isNaN(req.query.latitude)) return _400(res, "Invalid value to parameters 'longitude' and 'latitude'.");

  // TODO: if (req.user.admin) -- append a match (v:Volunteer) that's assigned to that node somehow
  if (req.query.dist)
    return cqdo(req, res, 'call spatial.withinDistance("turf", {longitude: {longitude}, latitude: {latitude}}, {dist}) yield node return node{.id, .name, .created}', req.query);
  else
    return cqdo(req, res, 'call spatial.intersects("turf", {longitude: {longitude}, latitude: {latitude}}) yield node return node{.id, .name, .created}', req.query);
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
      await req.db.query('match (a:Volunteer {id:{vId}}) return a', req.body);
      //let c = ret.data[0];

      await req.db.query('match (a:Turf {id:{turfId}}) return a', req.body);
      //let t = ret.data[0];

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
