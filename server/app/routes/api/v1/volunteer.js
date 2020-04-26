
import {
  _volunteersFromCypher, onMyTurf, volunteerCanSee, generateToken,
  cqdo, valid, _400, _403
} from '../../../lib/utils';

import { ID_NAME } from '../../../lib/consts';
import { Router } from 'express';

module.exports = Router({mergeParams: true})
.get('/volunteer/list', async (req, res) => {
  let volunteers = [];

  if (req.user.admin) volunteers = await _volunteersFromCypher(req, 'match (a:Volunteer) return a');
  else volunteers = await _volunteersFromCypher(req, 'match (a:Volunteer {id:{id}}) return a', req.user);

  return res.json(volunteers);
})
.get('/volunteer/get', async (req, res) => {
  if (!req.user.admin && req.query.id !== req.user.id && !await volunteerCanSee(req, req.user.id, req.query.id)) return _403(res, "Permission denied.");

  let volunteers = await _volunteersFromCypher(req, 'match (a:Volunteer {id:{id}}) return a', req.query);

  return res.json(volunteers[0]);
})
.post('/volunteer/update', async (req, res) => {
  // TODO: need to validate input, and only do updates based on what was posted
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");

  if (!req.user.admin && !await onMyTurf(req, req.user.id, req.body.id)) return _403(res, "Permission denied.");

  // can't update your location if your turf is set to auto
  if (req.body.id === req.user.id && req.user.autoturf) return _403(res, "Permission denied.");

  await req.db.query('match (a:Volunteer {id:{id}}) set a.locationstr={address}, a.location = point({longitude: {lng}, latitude: {lat}})', req.body);

  return res.json({});
})
.post('/volunteer/lock', async (req, res) => {
  if (req.body.id === req.user.id) return _403(res, "You can't lock yourself.");

  if (!req.user.admin && !await onMyTurf(req, req.user.id, req.body.id))
    return _403(res, "Permission denied.");

  let ref = await req.db.query("match (a:Volunteer {id:{id}}) return a", req.body);
  if (ref.data[0] && ref.data[0].admin === true)
    return _403(res, "Permission denied.");

  return cqdo(req, res, 'match (a:Volunteer {id:{id}}) set a.locked=true', req.body);
})
.post('/volunteer/unlock', (req, res) => {
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");
  if (!req.user.admin) return _403(res, "Permission denied.");
  return cqdo(req, res, 'match (a:Volunteer {id:{id}}) remove a.locked', req.body);
})
.get('/volunteer/visit/history', async (req, res) => {
  if (!req.query.formId) return _400(res, "Invalid value to parameter 'formId'.");

  if (!req.user.admin) {
    if (req.query.id && req.query.id !== req.user.id) return _403(res, "Permission denied.");
    req.query.id = req.user.id;
  }

  let ref = await req.db.query('match (v:Volunteer'+(req.user.admin?'':' {id:{id}}')+')<-[:VISIT_VOLUNTEER]-(vi:Visit)-[:VISIT_FORM]->(f:Form {id:{formId}}) where NOT vi.location is null optional match (vi)-[:VISIT_AT]->(u:Unit)-[:AT]->(a:Address) with v, vi, a{.*, street: a.street+\' #\'+u.name} as a optional match (vi)-[:VISIT_AT]->(ad:Address) with v, vi, CASE WHEN a.street is null THEN ad{.*} ELSE a END as a optional match (vi)-[:VISIT_PERSON]->(p:Person)<-[:ATTRIBUTE_OF]-(pa:PersonAttribute)-[:ATTRIBUTE_TYPE]->(at:Attribute {id:"'+ID_NAME+'"}) with {id: ID(vi), volunteer: v, address: a, status: vi.status, person: p{.*, name: pa.value}, datetime: vi.end} as h return distinct(h) order by h.datetime desc limit 100', req.query);

  return res.json(ref.data);
})
/**
 * @swagger
 *
 * /volunteer/apikey:
 *   get:
 *     description: Get your apikey
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/apikey"
 *   put:
 *     description: Generate a new apikey
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/apikey"
 *
 *   delete:
 *     description: Delete your apikey
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/empty"
 *
 */
.get('/volunteer/apikey', async (req, res) => {
  let ref = await req.db.query('match (v:Volunteer {id:{id}}) return v.apikey', req.user);
  return res.json({apikey: ref.data[0]});
})
.put('/volunteer/apikey', async (req, res) => {
  let apikey = await generateToken();
  await req.db.query('match (v:Volunteer {id:{id}}) set v.apikey = {apikey}', {apikey, id: req.user.id});
  return res.json({apikey});
})
.delete('/volunteer/apikey', async (req, res) => {
  await req.db.query('match (v:Volunteer {id:{id}}) set v.apikey = null', req.user);
  return res.json({});
})
