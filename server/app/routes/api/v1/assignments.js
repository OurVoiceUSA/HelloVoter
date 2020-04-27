import { Router } from 'express';

import { ov_config } from '../../../lib/ov_config';
import { _volunteersFromCypher, cqdo, _400, _403 } from '../../../lib/utils';

module.exports = Router({mergeParams: true})
.get('/turf/assigned/volunteer/list', async (req, res) => {
  if (!valid(req.query.turfId)) return _400(res, "Invalid value to parameter 'turfId'.");

  let volunteers = await _volunteersFromCypher(req, 'match (a:Turf {id:{turfId}})-[:ASSIGNED]-(b:Volunteer) return b', req.query, true);

  return res.json(volunteers);
})
.post('/turf/assigned/volunteer/add', async (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'turfId' or 'vId'.");
  if (!req.user.admin) return _403(res, "Permission denied.");

  if (req.body.turfId === 'auto')
    return cqdo(req, res, "match (a:Volunteer {id:{vId}}) set a.autoturf=true", req.body, true);

  if (!req.body.override) {
    await req.db.query('match (a:Volunteer {id:{vId}}) return a', req.body);
    //let c = ret.data[0];

    await req.db.query('match (a:Turf {id:{turfId}}) return a', req.body);
    //let t = ret.data[0];

    // TODO: config option for whether or not we care...
    //if (!ingeojson(JSON.parse(t.geometry), c.longitude, c.latitude)) return _400(res, "Volunteer location is not inside that turf.");
  }

  return cqdo(req, res, 'match (a:Turf {id:{turfId}}), (b:Volunteer {id:{vId}}) merge (a)-[:ASSIGNED]->(b)', req.body);
})
.post('/turf/assigned/volunteer/remove', async (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'turfId' or 'vId'.");

  if (req.body.turfId === 'auto')
    return cqdo(req, res, "match (a:Volunteer {id:{vId}}) set a.autoturf=null", req.body, true);

  return cqdo(req, res, 'match (a:Turf {id:{turfId}})-[r:ASSIGNED]-(b:Volunteer {id:{vId}}) delete r', req.body, true);
})
