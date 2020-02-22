
import {
  cqdo, valid, _400, _500,
} from '../../../lib/utils';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.post('/attribute/create', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");
  if (!valid(req.body.type)) return _400(res, "Invalid value to parameter 'type'.");
  if (req.body.value && !valid(req.body.value)) return _400(res, "Invalid value to parameter 'value'.");
  req.body.author_id = req.user.id;

  switch (req.body.type.toLowerCase()) {
    case 'string':
    case 'textbox':
    case 'number':
    case 'boolean':
    case 'date':
    case 'sand':
    case 'hyperlink':
      break;
    default: return _400(res, "Invalid value to parameter 'type'.");
  }

  let attributeId;

  try {
    let ref = await req.db.query('match (v:Volunteer {id:{author_id}}) create (a:Attribute {id:randomUUID(), created: timestamp(), name:{name}, type:{type}})-[:AUTHOR]->(v) return a.id', req.body);
    attributeId = ref.data[0];

    if (req.body.type.toLowerCase() === 'sand')
      await req.db.query('match (at:Attribute {id:{id}}) set at.type = {type}, at.values = {values}', {id: attributeId, type: 'string', values: ["SA","A","N","D","SD"]});
    if (req.body.type.toLowerCase() === 'hyperlink')
      await req.db.query('match (at:Attribute {id:{id}}) set at.value = {value}', {id: attributeId, value: req.body.value});
    if (req.body.options && typeof req.body.options === "object" && req.body.options.length)
      await req.db.query('match (at:Attribute {id:{id}}) set at.values = {values}', {id: attributeId, values: req.body.options});
  } catch(e) {
    return _500(res, e);
  }

  return res.json({attributeId});
})
.post('/attribute/update', (req, res) => {
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");

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

  return cqdo(req, res, 'match (at:Attribute {id:{id}}) set at.updated = timestamp(), at.name = {name}'+(req.body.type?', at.type = {type}':'')+' return at', req.body, true);
})
.get('/attribute/get', (req, res) => {
  if (!valid(req.query.id)) return _400(res, "Invalid value to parameter 'id'.");
  return cqdo(req, res, 'match (a:Attribute {id:{id}}) return a', req.query, true);
})
.get('/attribute/list', (req, res) => {
  if (req.user.admin === true)
    return cqdo(req, res, 'match (at:Attribute) return at order by at.order', {}, true);
  else
    return cqdo(req, res, `
  match (v:Volunteer {id:{id}})
  optional match (v)-[:ASSIGNED]-(f:Form) with v, collect(f) as dforms
  optional match (v)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(f:Form) with v, dforms + collect(f) as forms
  unwind forms as f
  match (at:Attribute)-[:COMPILED_ON]->(f)
  return at order by at.order
    `, req.user);
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
.post('/attribute/delete', (req, res) => {
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'.");
  return cqdo(req, res, 'match (a:Attribute {id:{id}}) detach delete a', req.body, true);
});
