import { Router } from 'express';
import _ from 'lodash';

import { generateToken, valid, _400, _403, _404 } from '../../../lib/utils';
import { ID_NAME } from '../../../lib/consts';

module.exports = Router({mergeParams: true})
/**
 * @swagger
 *
 * /volunteer/whoami:
 *   get:
 *     description: Get your volunteer object
 *     tags:
 *       - volunteers
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/object"
 */
.get('/volunteer/whoami', async (req, res) => {
  let ref = await req.db.query('match (v:Volunteer {id:{id}}) return v', req.user);
  return res.json(ref.data[0]);
})
/**
 * @swagger
 *
 * /volunteer/{id}:
 *   get:
 *     description: Get a volunteer by their id
 *     tags:
 *       - volunteers
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
 *               "$ref": "#/components/schemas/data"
 *   put:
 *     description: Update a given property of a volunteer
 *     tags:
 *       - volunteers
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
 *             allOf:
 *               - "$ref": "#/components/schemas/address"
 *               - "$ref": "#/components/schemas/longitude"
 *               - "$ref": "#/components/schemas/latitude"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/data"
 */
.get('/volunteer/:id', async (req, res) => {
  if (!req.user.admin && req.params.id !== req.user.id) return _403(res, "Permission denied.");
  let ref = await req.db.query('match (v:Volunteer {id:{id}}) return v{.id, .name, .email, .avatar, .locationstr, .admin}', req.params);
  return res.json(ref.data[0]);
})
.put('/volunteer/:id', async (req, res) => {
  // TODO: need to validate input, and only do updates based on what was posted
  if (!valid(req.body.address) || !valid(req.body.longitude) || !valid(req.body.latitude)) return _400(res, "Invalid value to parameter 'id'.");
  if (!req.user.admin && req.params.id !== req.user.id) return _403(res, "Permission denied.");

  // can't update your location if your turf is set to auto
  if (req.params.id === req.user.id && req.user.autoturf) return _403(res, "Permission denied.");

  await req.db.query(`match (v:Volunteer {id:{id}}) set
    v.locationstr={address},
    v.location = point({longitude: {longitude}, latitude: {latitude}})`,
    _.merge({}, req.body, req.params));

  return res.json({});
})
/**
 * @swagger
 *
 * /volunteer/{id}/lock:
 *   put:
 *     description: Lock a volunteer out of the system
 *     tags:
 *       - volunteers
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
 *               "$ref": "#/components/schemas/data"
 *   delete:
 *     description: Remove the lock on a volunteer
 *     tags:
 *       - volunteers
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
 *               "$ref": "#/components/schemas/data"
 */
.put('/volunteer/:id/lock', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (req.params.id === req.user.id) return _403(res, "You can't lock yourself.");

  let ref = await req.db.query("match (a:Volunteer {id:{id}}) return a", req.params);
  if (ref.data[0] && ref.data[0].admin === true) return _403(res, "Permission denied.");

  await req.db.query('match (a:Volunteer {id:{id}}) set a.locked=true', req.params);
  return res.json({updated: true})
})
.delete('/volunteer/:id/lock', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  await req.db.query('match (a:Volunteer {id:{id}}) remove a.locked', req.params);
  return res.json({updated: true})
})
/**
 * @swagger
 *
 * /volunteer/{id}/visits:
 *   get:
 *     description: Get a volunteer's visit history
 *     tags:
 *       - volunteers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *       - in: query
 *         name: formId
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/data"
 */
.get('/volunteer/:id/visits', async (req, res) => {
  if (!req.query.formId) return _400(res, "Invalid value to parameter 'formId'.");

  if (!req.user.admin && req.params.id !== req.user.id) return _403(res, "Permission denied.");

  let ref = await req.db.query(`match (v:Volunteer`+
    (req.user.admin?``:` {id:{id}}`)+
    `)<-[:VISIT_VOLUNTEER]-(vi:Visit)-[:VISIT_FORM]->(f:Form {id:{formId}})
      where NOT vi.location is null
    optional match (vi)-[:VISIT_AT]->(u:Unit)-[:AT]->(a:Address)
      with v, vi, a{.*, street: a.street+\' #\'+u.name} as a
    optional match (vi)-[:VISIT_AT]->(ad:Address)
      with v, vi, CASE WHEN a.street is null THEN ad{.*} ELSE a END as a
    optional match (vi)-[:VISIT_PERSON]->(p:Person)<-[:ATTRIBUTE_OF]-(pa:PersonAttribute)-[:ATTRIBUTE_TYPE]->(at:Attribute {id:"'+ID_NAME+'"})
      with {id: ID(vi), volunteer: v, address: a, status: vi.status, person: p{.*, name: pa.value}, datetime: vi.end} as h
    return distinct(h) order by h.datetime desc limit 100`,
    _.merge({}, req.query, req.params));

  return res.json({
    count: ref.data.length,
    visits: ref.data,
  });
})
/**
 * @swagger
 *
 * /volunteer/{id}/apikey:
 *   get:
 *     description: Get your apikey
 *     tags:
 *       - volunteers
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
 *               "$ref": "#/components/schemas/apikey"
 *   put:
 *     description: Generate a new apikey
 *     tags:
 *       - volunteers
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
 *               "$ref": "#/components/schemas/apikey"
 *
 *   delete:
 *     description: Delete your apikey
 *     tags:
 *       - volunteers
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
 *
 */
.get('/volunteer/:id/apikey', async (req, res) => {
  if (!req.user.admin && req.params.id !== req.user.id) return _404(res, "Volunteer not found");
  let ref = await req.db.query('match (v:Volunteer {id:{id}}) return v.apikey', req.params);
  return res.json({apikey: ref.data[0]});
})
.put('/volunteer/:id/apikey', async (req, res) => {
  if (!req.user.admin && req.params.id !== req.user.id) return _404(res, "Volunteer not found");
  let apikey = await generateToken();
  await req.db.query('match (v:Volunteer {id:{id}}) set v.apikey = {apikey}',
    _.merge({apikey}, req.params));
  return res.json({apikey});
})
.delete('/volunteer/:id/apikey', async (req, res) => {
  if (!req.user.admin && req.params.id !== req.user.id) return _404(res, "Volunteer not found");
  await req.db.query('match (v:Volunteer {id:{id}}) set v.apikey = null',
    _.merge({}, req.body, req.params));
  return res.json({});
})
/**
 * @swagger
 *
 * /volunteers:
 *   get:
 *     description: Get an array of volunteers matching a filter.
 *     tags:
 *       - volunteers
 *     parameters:
 *       - in: query
 *         name: filter
 *         type: array
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
 *               "$ref": "#/components/schemas/volunteers"
 */
.get('/volunteers', async (req, res) => {
  if (req.query.start) req.query.start = parseInt(req.query.start);
  else req.query.start = 0;
  if (req.query.limit) req.query.limit = parseInt(req.query.limit);
  if (req.query.filter) req.query.filter = '.*'+req.query.filter+'.*';

  let ref = await req.db.query(`match (v:Volunteer`+(req.user.admin?``:` {id:{id}}`)+`)
    `+(req.query.filter?` where v.name =~ {filter} or v.email =~ {filter} or v.locationstr = {filter}`:``)+
    ` return v{.id, .name, .email, .avatar, .locationstr, .admin} order by v.name skip {start}`+(req.query.limit?` limit {limit}`:``),
    _.merge({}, req.query, req.user));

  return res.json({
    count: ref.data.length,
    volunteers: ref.data,
  });
})
