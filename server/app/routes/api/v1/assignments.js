import { Router } from 'express';

import { ov_config } from '../../../lib/ov_config';
import { _volunteersFromCypher, _400, _403 } from '../../../lib/utils';

async function cqdo(req, res, q, p, a) {
  if (a === true && req.user.admin !== true)
    return _403(res, "Permission denied.");
  let ref = await req.db.query(q, p);
  return res.status(200).json({msg: "OK", data: ref.data});
}

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
.get('/form/assigned/volunteer/list', async (req, res) => {
  if (!valid(req.query.formId)) return _400(res, "Invalid value to parameter 'formId'.");

  let volunteers = await _volunteersFromCypher(req, 'match (a:Form {id:{formId}})-[:ASSIGNED]-(b:Volunteer) return b', req.query, true);

  return res.json(volunteers);
})
.post('/form/assigned/volunteer/add', (req, res) => {
  if (!valid(req.body.formId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'formId' or 'vId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}}), (b:Volunteer {id:{vId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
})
.post('/form/assigned/volunteer/remove', (req, res) => {
  if (!valid(req.body.formId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'formId' or 'vId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}})-[r:ASSIGNED]-(b:Volunteer {id:{vId}}) delete r', req.body, true);
})
.get('/attribute/form/list', (req, res) => {
  if (!valid(req.query.id)) return _400(res, "Invalid value to parameter 'id'.");
  return cqdo(req, res, 'match (a:Attribute {id:{id}})-[:COMPILED_ON]-(b:Form) return b', req.query, true);
})
.post('/attribute/form/add', (req, res) => {
  if (!valid(req.body.id) || !valid(req.body.formId)) return _400(res, "Invalid value to parameter 'key' or 'formId'.");
  return cqdo(req, res, 'match (a:Attribute {id:{id}}) with a match (b:Form {id:{formId}}) merge (a)-[:COMPILED_ON]->(b)', req.body, true);
})
.post('/attribute/form/remove', (req, res) => {
  if (!valid(req.body.id) || !valid(req.body.formId)) return _400(res, "Invalid value to parameter 'key' or 'formId'.");
  return cqdo(req, res, 'match (a:Attribute {id:{id}})-[r:COMPILED_ON]-(b:Form {id:{formId}}) delete r', req.body, true);
})
.post('/qrcode/turf/add', async (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.qId)) return _400(res, "Invalid value to parameter 'turfId' or 'qId'.");
  return cqdo(req, res, 'match (t:Turf {id:{turfId}}) match (qr:QRCode {id:{qId}}) merge (qr)-[:AUTOASSIGN_TO]->(t)', req.body);
})
.post('/qrcode/turf/remove', async (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.qId)) return _400(res, "Invalid value to parameter 'turfId' or 'qId'.");
  return cqdo(req, res, 'match (t:Turf {id:{turfId}})<-[r:AUTOASSIGN_TO]-(:QRCode {id:{qId}}) delete r', req.body, true);
})
.post('/qrcode/form/add', async (req, res) => {
  if (!valid(req.body.formId) || !valid(req.body.qId)) return _400(res, "Invalid value to parameter 'formId' or 'qId'.");
  return cqdo(req, res, 'match (f:Form {id:{formId}}) match (qr:QRCode {id:{qId}}) merge (qr)-[:AUTOASSIGN_TO]->(f)', req.body);
})
.post('/qrcode/form/remove', async (req, res) => {
  if (!valid(req.body.formId) || !valid(req.body.qId)) return _400(res, "Invalid value to parameter 'formId' or 'qId'.");
  return cqdo(req, res, 'match (f:Form {id:{formId}})<-[r:AUTOASSIGN_TO]-(:QRCode {id:{qId}}) delete r', req.body, true);
})
