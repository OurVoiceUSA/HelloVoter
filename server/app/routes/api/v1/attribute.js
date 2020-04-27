import { Router } from 'express';
import _ from 'lodash';
import { valid, _400, _404 } from '../../../lib/utils';

module.exports = Router({mergeParams: true})
/**
 * @swagger
 *
 * /attribute:
 *   post:
 *     description: Create a new attribute
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - "$ref": "#/components/schemas/name"
 *               - "$ref": "#/components/schemas/type"
 *               - "$ref": "#/components/schemas/options"
 *               - "$ref": "#/components/schemas/value"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/attributeId"
 */
.post('/attribute', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");
  if (!valid(req.body.type)) return _400(res, "Invalid value to parameter 'type'.");
  if (req.body.value && !valid(req.body.value)) return _400(res, "Invalid value to parameter 'value'.");
  req.body.author_id = req.user.id;

  // TODO: prevent dupicate name

  switch (req.body.type.toLowerCase()) {
    case 'string':
    case 'textbox':
    case 'number':
    case 'boolean':
    case 'date':
    case 'sand':
    case 'hyperlink':
    case 'note':
      break;
    default: return _400(res, "Invalid value to parameter 'type'.");
  }

  let ref = await req.db.query('match (v:Volunteer {id:{author_id}}) create (a:Attribute {id:randomUUID(), created: timestamp(), name:{name}, type:{type}})-[:AUTHOR]->(v) return a.id', req.body);
  let attributeId = ref.data[0];

  if (req.body.type.toLowerCase() === 'sand')
    await req.db.query('match (at:Attribute {id:{id}}) set at.type = {type}, at.values = {values}', {id: attributeId, type: 'string', values: ["SA","A","N","D","SD"]});
  if (req.body.type.toLowerCase() === 'hyperlink' || req.body.type.toLowerCase() === 'note')
    await req.db.query('match (at:Attribute {id:{id}}) set at.value = {value}', {id: attributeId, value: req.body.value});
  if (req.body.options && typeof req.body.options === "object" && req.body.options.length)
    await req.db.query('match (at:Attribute {id:{id}}) set at.values = {values}', {id: attributeId, values: req.body.options});

  return res.json({attributeId});
})
/**
 * @swagger
 *
 * /attribute/{id}:
 *   get:
 *     description: Get attribute object definition
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
 *     description: Update a given property of an attribute
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
 *               - "$ref": "#/components/schemas/name"
 *               - "$ref": "#/components/schemas/type"
 *               - "$ref": "#/components/schemas/options"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/attributeId"
 *   delete:
 *     description: Delete an attribute
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
.get('/attribute/:id', async (req, res) => {
  if (!valid(req.params.id)) return _400(res, "Invalid value to parameter 'id'.");
  // TODO: for non-admin, is this attribute COMPILED_ON a form they can see?
  let ref = await req.db.query('match (a:Attribute {id:{id}}) return a', req.params);
  if (ref.data.length === 0) return _404(res, "Attribute not found.");
  return res.json(ref.data[0])
})
.put('/attribute/:id', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!valid(req.params.id)) return _400(res, "Invalid value to parameter 'id'.");

  if (req.body.type) {
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
  }

  await req.db.query(`match (at:Attribute {id:{id}})
    set at.updated = timestamp(),
    at.name = {name}`+
    (req.body.type?`, at.type = {type}`:``)+
    ` return at`,
    _.merge({}, req.body, req.params));

  return res.json({updated: true});
})
.delete('/attribute/:id', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!valid(req.params.id)) return _400(res, "Invalid value to parameter 'id'.");
  // TODO: can take a while when used on large databases. Queue + iterate this!
  await req.db.query('match (at:Attribute {id:{id}}) detach delete at', req.params);
  return res.json({deleted: true});
})
/**
 * @swagger
 *
 * /attributes:
 *   get:
 *     description: Get an array of attribute objects matching a filter.
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
 *               "$ref": "#/components/schemas/attributes"
 */
.get('/attributes', async (req, res) => {
  if (req.query.start) req.query.start = parseInt(req.query.start);
  else req.query.start = 0;
  if (req.query.limit) req.query.limit = parseInt(req.query.limit);
  if (req.query.filter) req.query.filter = '.*'+req.query.filter+'.*';

  let ref = await req.db.query(
    (req.user.admin?
      `match (at:Attribute)`
      :
      `match (v:Volunteer {id:{id}})
  optional match (v)-[:ASSIGNED]-(f:Form) with v, collect(f) as dforms
  optional match (v)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(f:Form) with v, dforms + collect(f) as forms
  unwind forms as f
  match (at:Attribute)-[:COMPILED_ON]->(f)`
    )+
    (req.query.filter?` where at.name =~ {filter}`:``)+
    ` return at order by at.order skip {start} `+(req.query.limit?`limit {limit}`:``),
    _.merge({}, req.query, req.user));

  return res.json({
    count: ref.data.length,
    attributes: ref.data,
  });
})
