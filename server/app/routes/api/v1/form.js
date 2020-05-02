import { Router } from 'express';
import _ from 'lodash';

import { volunteerAssignments, valid, _400, _403 } from '../../../lib/utils';
import { hv_config } from '../../../lib/hv_config';

module.exports = Router({mergeParams: true})
/**
 * @swagger
 *
 * /form:
 *   post:
 *     description: Create a new form
 *     tags:
 *       - forms
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
 *               "$ref": "#/components/schemas/formId"
 */
.post('/form', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.name) || typeof req.body.attributes !== "object")
    return _400(res, "Invalid value to parameter 'name' or 'attributes'.");

  // TODO: validate every attributes exists
  req.body.author_id = req.user.id;

  // attributes property stores which order they come in as
  let ref = await req.db.query('match (a:Volunteer {id:{author_id}}) create (b:Form {id: randomUUID(), created: timestamp(), updated: timestamp(), name:{name}, attributes:{attributes}})-[:AUTHOR]->(a) with b unwind {attributes} as attr match (a:Attribute {id:attr}) merge (a)-[:COMPILED_ON]->(b) return b.id', req.body);

  return res.json({formId: ref[0]});
})
/**
 * @swagger
 *
 * /form/{id}:
 *   get:
 *     description: Get form object definition and the attributes that are compiled on it
 *     tags:
 *       - forms
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
 *     description: Update a given property of a form
 *     tags:
 *       - forms
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *       - in: query
 *         name: name
 *         type: string
 *       - in: query
 *         name: public_onboard
 *         type: boolean
 *       - in: query
 *         name: attributes
 *         type: array
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - "$ref": "#/components/schemas/name"
 *               - "$ref": "#/components/schemas/attributes"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/formId"
 *   delete:
 *     description: Delete a form
 *     tags:
 *       - forms
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
.get('/form/:formId', async (req, res) => {
  let ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (!req.user.admin && !idInArrObj(ass.forms, req.params.formId)) return _403(res, "Volunteer is not assigned to this form.");

  let form = {};

  let a = await req.db.query('match (a:Form {id:{formId}})-[:AUTHOR]-(b:Volunteer) return a,b', req.params);
  form = a[0][0];
  form.author_id = a[0][1].id;
  form.author = a[0][1].name;

  // convert array of form IDs to array of form objects
  let order = _.merge({}, form.attributes);
  form.attributes = [];
  let b = await req.db.query('match (a:Attribute)-[c:COMPILED_ON]->(b:Form {id:{formId}}) return a{.*, readonly: c.readonly}', req.params);
  for (let o in order) {
    let id = order[o];
    for (let i in b) {
      if (b[i].id === id) form.attributes.push(b[i]);
    }
  }

  // add the user's turfs to this form
  let c = await req.db.query('match (t:Turf) where t.id in {turfIds} return t.id, t.name, t.geometry', {turfIds: idFromArrObj(ass.turfs)});
  form.turfs = c.map(t => {
    let turf = JSON.parse(t[2]);
    turf.id = t[0];
    turf.name = t[1];
    return turf;
  });

  // add default filters to this form
  let d = await req.db.query('match (:Form {id:{formId}})-[r:DEFAULT_FILTER]->(at:Attribute) return at{.*, value: r.value}', req.params);
  if (d[0]) form.default_filters = d;

  if (hv_config.volunteer_add_new) form.add_new = true;

  return res.json(form);
})
.put('/form/:formId', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");

  if (req.body.name && !valid(req.body.name))
    return _400(res, "Invalid value to parameter 'name'.");

  if (req.body.attributes && typeof req.body.attributes !== "object")
    return _400(res, "Invalid value to parameter 'attributes'.");

  if (req.body.public_onboard !== undefined && typeof req.body.public_onboard !== "boolean")
    return _400(res, "Invalid value to parameter 'public_onboard'.");

  // TODO: validate every attributes exists
  if (req.body.name) await req.db.query('match (f:Form {id: {formId}}) set f.updated = timestamp(), f.name = {name}', _.merge({}, req.body, req.params));
  if (req.body.attributes) await req.db.query('match (f:Form {id: {formId}}) set f.updated = timestamp(), f.attributes = {attributes} with f optional match (f)<-[r:COMPILED_ON]-(:Attribute) delete r with f unwind {attributes} as attr match (at:Attribute {id:attr}) merge (at)-[:COMPILED_ON]->(f)', _.merge({}, req.body, req.params));
  if (req.body.public_onboard !== undefined) await req.db.query('match (f:Form {id: {formId}}) set f.updated = timestamp(), f.public_onboard = {public_onboard}', _.merge({}, req.body, req.params));

  return res.json({updated: true});
})
.delete('/form/:formId', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  await req.db.query('match (f:Form {id:{formId}}) set f:DeletedForm remove f:Form', req.params);
  return res.json({deleted: true});
})
/**
 * @swagger
 *
 * /forms:
 *   get:
 *     description: Get an array of form objects matching a filter.
 *     tags:
 *       - forms
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
 *               "$ref": "#/components/schemas/forms"
 */
.get('/forms', async (req, res) => {
  let forms;

// TODO: filter, start, limit

  if (req.user.admin)
    forms = await req.db.query('match (a:Form) return a');
  else
    forms = await req.db.query('match (v:Volunteer {id:{id}})-[:ASSIGNED]-(f:Form) return f', req.user);

  return res.json({
    count: forms.length,
    forms,
  });
})

// TODO: use lodash for the below?

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
