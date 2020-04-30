import { Router } from 'express';
import _ from 'lodash';
import wkx from 'wkx';

import { asyncForEach, sleep, valid, _400, _403 } from '../../../lib/utils';
import { hv_config } from '../../../lib/hv_config';

module.exports = Router({mergeParams: true})
/**
 * @swagger
 *
 * /turf:
 *   post:
 *     description: Create a new turf
 *     tags:
 *       - turf
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - "$ref": "#/components/schemas/name"
 *               - "$ref": "#/components/schemas/geometry"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/turfId"
 */
.post('/turf', async (req, res) => {
   if (!req.user.admin) return _403(res, "Permission denied.");
   if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");
   if (typeof req.body.geometry !== "object" || typeof req.body.geometry.coordinates !== "object") return _400(res, "Invalid value to parameter 'geometry'.");

   req.body.wkt = wkx.Geometry.parseGeoJSON(req.body.geometry).toEwkt().split(';')[1];

   // store geojson too as string
   req.body.geometry = JSON.stringify(req.body.geometry);
   req.body.author_id = req.user.id;

   // create Turf
   let ref = await req.db.query('match (v:Volunteer {id:{author_id}}) create (b:Turf {id:randomUUID(), created: timestamp(), name:{name}, geometry: {geometry}, wkt:{wkt}})-[:AUTHOR]->(v) '+
       'WITH b, collect(b) AS t CALL spatial.addNodes(\'turf\', t) YIELD count '+
       'return b.id',
     req.body);

   let job = await req.qq.queueTask('doTurfIndexing', 'Turf {id:{turfId}}', {turfId: ref[0]});

   job.turfId = ref[0];

   return res.json(job);
})
/**
 * @swagger
 *
 * /turf/{id}:
 *   get:
 *     description: Get turf object
 *     tags:
 *       - turf
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *       - in: query
 *         name: formId
 *         type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/data"
 *   put:
 *     description: Update a given property of a turf
 *     tags:
 *       - turf
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             "$ref": "#/components/schemas/name"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/empty"
 *   delete:
 *     description: Delete a turf
 *     tags:
 *       - turf
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/empty"
 */
.get('/turf/:turfId', async (req, res) => {
  let ref, turf = {};

  if (req.user.admin) {
    ref = await req.db.query('match (t:Turf {id:{turfId}}) return t', req.params);
  } else {
    ref = await req.db.query(`match (:Volunteer {id:{id}})-[:ASSIGNED]-(t:Turf {id:{turfId}})
      return t
      UNION
      match (:Volunteer {id:{id}})-[:ASSIGNED]-(:Team)-[:ASSIGNED]-(t:Turf {id:{turfId}})
      return t`,
      _.merge({}, req.params, req.user));
  }

  if (ref.length) {
    turf = _.merge({}, ref[0]);

    ref = await req.db.query(`
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
    req.params);

    // turf stats
    turf.stats = {
      'Last Touch': ref[0][0],
      'Most active volunteer': ref[0][1],
      'Number of active volunteers': ref[0][2],
      'Number of volunteers assigned': ref[0][3],
      'First assigned': 'N/A',
      'Stats by Attribute': {
        'total': await stats_by_attr(req),
      }
    };
    await asyncForEach((await req.db.query('match (aq:AttributeQuery) return aq.id, aq.name order by aq.name')), async (aq) => {
      turf.stats['Stats by Attribute'][aq[1]] = await stats_by_attr(req, aq[0]);
    });
  }

  if (req.user.admin && req.query.formId) {
    ref = await req.db.query(`match (t:Turf {id:{turfId}})
      match (f:Form {id:{formId}})
      match (t)--(qr:QRCode)--(f)
      return qr.id limit 1`,
      _.merge({}, req.query, req.params));
    turf.qrcode = ref[0];
  }

  return res.json(turf);
})
.put('/turf/:turfId', async (req, res) => {
  // TODO
})
.delete('/turf/:turfId', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  // TODO: queue this & iterate
  await req.db.query('match (t:Turf {id:{turfId}}) detach delete t', req.params);
  return res.json({deleted: true});
})
/**
 * @swagger
 *
 * /turfs:
 *   get:
 *     description: Get an array of turf objects matching a filter.
 *     tags:
 *       - turf
 *     parameters:
 *       - in: query
 *         name: filter
 *         type: array
 *       - in: query
 *         name: longitude
 *         type: integer
 *       - in: query
 *         name: latitude
 *         type: integer
 *       - in: query
 *         name: start
 *         type: integer
 *       - in: query
 *         name: limit
 *         type: integer
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/data"
 */
.get('/turfs', async (req, res) => {
  let geom = false;
  if (req.query.geometry) geom = true;

// TODO: filter, start, limit
  let turfs;

  if (req.query.longitude || req.query.latitude) {
    req.query.longitude = parseFloat(req.query.longitude);
    req.query.latitude = parseFloat(req.query.latitude);
    if (isNaN(req.query.longitude) || isNaN(req.query.latitude)) return _400(res, "Invalid value to parameters 'longitude' or 'latitude'.");

    turfs = await req.db.query('call spatial.intersects("turf", {longitude: {longitude}, latitude: {latitude}}) yield node return node{.id, .name, .created}', req.query);
  } else {

    if (req.user.admin)
      turfs = await req.db.query('match (a:Turf) return a{.id, .name, .created'+(geom?', .geometry':'')+'} order by a.name');
    else
      turfs = await req.db.query('match (v:Volunteer {id:{id}}) optional match (v)-[:ASSIGNED]-(t:Turf) with v, t as dturf optional match (v)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(t:Turf) with v, dturf + collect(t) as turf unwind turf as t call spatial.intersects("turf", t.wkt) yield node return node{.id, .name, .created'+(geom?', .geometry':'')+'} order by node.name', req.user);
  }

  return res.json({
    count: turfs.length,
    turfs,
  });
})

async function stats_by_attr(req, aq) {
  let c = '';
  let ref;
  if (aq) {
    ref = await req.db.query('match (aq:AttributeQuery {id:{id}})-[r:CONSTRAIN]->(at:Attribute) return at.id, r.not, r.op, r.value', {id: aq});
    c = ref.map((attr, idx) => {
      req.query['aid'+idx] = attr[0];
      req.query['aval'+idx] = attr[3];
      return 'match (p)<-[:ATTRIBUTE_OF]-(pa'+idx+':PersonAttribute)-[:ATTRIBUTE_TYPE]->(:Attribute {id:{aid'+idx+'}}) where '+(attr[1]?'NOT':'')+' pa'+idx+'.value '+attr[2]+' {aval'+idx+'}';
    }).join(' ');
  }
  ref = await req.db.query(`
match (p:Person)-[:RESIDENCE {current:true}]->()-[*0..1]-(a:Address)-[:WITHIN]->(t:Turf {id:{turfId}})
`+c+`
optional match (p)<-[:VISIT_PERSON]-(vi:Visit)
  with a, p, CASE WHEN (count(vi) > 0) THEN {visits: count(vi)} ELSE NULL END as visits
optional match (p)<-[:VISIT_PERSON]-(rvi:Visit) where rvi.end > timestamp()-(1000*60*60*24*30)
  with a, p, visits, CASE WHEN (count(rvi) > 0) THEN {visits: count(rvi)} ELSE NULL END as recent_visits
return count(distinct(a)), count(p), count(visits), count(recent_visits)`
  , _.merge({}, req.query, req.params));
  return {
    'Total Addresses': ref[0][0],
    'Total People': ref[0][1],
    'Total People Visited': ref[0][2],
    'People Visited in past month': ref[0][3],
  };
}
