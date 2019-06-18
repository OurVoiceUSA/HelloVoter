
import {
  _volunteersFromCypher, volunteerAssignments,
  cqdo, valid, _400, _403, _500
} from '../../../../app/lib/utils';

const Router = require('express').Router

module.exports = Router({mergeParams: true})
.post('/attribute/create', (req, res) => {
  if (!valid(req.body.name) || !valid(req.body.type)) return _400(res, "Invalid value to parameter 'name' or 'type'.");
  req.body.author_id = req.user.id;

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

  return cqdo(req, res, 'match (a:Volunteer {id:{author_id}}) create (b:Attribute {id:randomUUID(), created: timestamp(), name:{name}, type:{type}})-[:AUTHOR]->(a)', req.body, true);
})
.get('/attribute/list', (req, res) => {
  if (req.user.admin === true)
    return cqdo(req, res, 'match (a:Attribute) return a order by a.order', {}, true);
  else
    return cqdo(req, res, `
  match (v:Volunteer {id:{id}})
  optional match (v)-[:ASSIGNED]-(f:Form) with v, collect(f) as dforms
  optional match (v)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(f:Form) with v, dforms + collect(f) as forms
  unwind forms as f
  match (a:Attribute)-[:COMPILED_ON]->(f)
  return a order by a.order
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
