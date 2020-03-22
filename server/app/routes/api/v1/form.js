
import { deepCopy } from 'ourvoiceusa-sdk-js';

import {
  _volunteersFromCypher, volunteerAssignments,
  cqdo, valid, _400, _403, _500
} from '../../../lib/utils';

import { ov_config } from '../../../lib/ov_config';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.get('/form/get', async (req, res) => {
  let ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (!req.user.admin && !idInArrObj(ass.forms, req.query.formId)) return _403(res, "Volunteer is not assigned to this form.");

  let form = {};

  try {
    let a = await req.db.query('match (a:Form {id:{formId}})-[:AUTHOR]-(b:Volunteer) return a,b', req.query);
    form = a.data[0][0];
    form.author_id = a.data[0][1].id;
    form.author = a.data[0][1].name;
    // convert array of form IDs to array of form objects
    let order = deepCopy(form.attributes);
    form.attributes = [];
    let b = await req.db.query('match (a:Attribute)-[c:COMPILED_ON]->(b:Form {id:{formId}}) return a{.*, readonly: c.readonly}', req.query);
    for (let o in order) {
      let id = order[o];
      for (let i in b.data) {
        if (b.data[i].id === id) form.attributes.push(b.data[i]);
      }
    }
    // add the user's turfs to this form
    let c = await req.db.query('match (t:Turf) where t.id in {turfIds} return t.id, t.name, t.geometry', {turfIds: idFromArrObj(ass.turfs)});
    form.turfs = c.data.map(t => {
      let turf = JSON.parse(t[2]);
      turf.id = t[0];
      turf.name = t[1];
      return turf;
    });
    // add default filters to this form
    let d = await req.db.query('match (:Form {id:{formId}})-[r:DEFAULT_FILTER]->(at:Attribute) return at{.*, value: r.value}', req.query);
    if (d.data[0]) form.default_filters = d.data;
  } catch (e) {
    return _500(res, e);
  }

  if (ov_config.volunteer_add_new) form.add_new = true;

  return res.json(form);
})
.get('/form/list', async (req, res) => {
  let ref;
  let list = [];

  try {
    if (req.user.admin)
      ref = await req.db.query('match (a:Form) return a');
    else
      ref = await req.db.query('match (v:Volunteer {id:{id}})-[:ASSIGNED]-(f:Form) return f', req.user);

    list = ref.data;
  } catch (e) {
    return _500(res, e);
  }

  return res.json(list);
})
.post('/form/create', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.name) || typeof req.body.attributes !== "object")
    return _400(res, "Invalid value to parameter 'name' or 'attributes'.");

  // TODO: validate every attributes exists
  let ref;
  req.body.author_id = req.user.id;

  try {
    // attributes property stores which order they come in as
    ref = await req.db.query('match (a:Volunteer {id:{author_id}}) create (b:Form {id: randomUUID(), created: timestamp(), updated: timestamp(), name:{name}, attributes:{attributes}})-[:AUTHOR]->(a) with b unwind {attributes} as attr match (a:Attribute {id:attr}) merge (a)-[:COMPILED_ON]->(b) return b.id', req.body);
  } catch (e) {
    return _500(res, e);
  }

  return res.json({formId: ref.data[0]});
})
.post('/form/update', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.formId))
    return _400(res, "Invalid value to parameter 'formId'.");

  if (req.body.name && !valid(req.body.name))
    return _400(res, "Invalid value to parameter 'name'.");

  if (req.body.attributes && typeof req.body.attributes !== "object")
    return _400(res, "Invalid value to parameter 'attributes'.");

  if (req.body.public_onboard !== undefined && typeof req.body.public_onboard !== "boolean")
    return _400(res, "Invalid value to parameter 'public_onboard'.");

  // TODO: validate every attributes exists
  let ref;

  try {
    if (req.body.name) await req.db.query('match (f:Form {id: {formId}}) set f.updated = timestamp(), f.name = {name}', req.body);
    if (req.body.attributes) await req.db.query('match (f:Form {id: {formId}}) set f.updated = timestamp(), f.attributes = {attributes} with f optional match (f)<-[r:COMPILED_ON]-(:Attribute) delete r with f unwind {attributes} as attr match (at:Attribute {id:attr}) merge (at)-[:COMPILED_ON]->(f)', req.body);
    if (req.body.public_onboard) await req.db.query('match (f:Form {id: {formId}}) set f.updated = timestamp(), f.public_onboard = {public_onboard}', req.body);
  } catch (e) {
    return _500(res, e);
  }

  return res.json({});
})
.post('/form/delete', (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.formId)) return _400(res, "Invalid value to parameter 'formId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}}) detach delete a', req.body, true);
})
.get('/form/assigned/volunteer/list', async (req, res) => {
  if (!valid(req.query.formId)) return _400(res, "Invalid value to parameter 'formId'.");

  let volunteers;

  try {
    volunteers = await _volunteersFromCypher(req, 'match (a:Form {id:{formId}})-[:ASSIGNED]-(b:Volunteer) return b', req.query, true);
  } catch (e) {
    return _500(res, e)
  }

  return res.json(volunteers);
})
.post('/form/assigned/volunteer/add', (req, res) => {
  if (!valid(req.body.formId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'formId' or 'vId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}}), (b:Volunteer {id:{vId}}) merge (a)-[:ASSIGNED]->(b)', req.body, true);
})
.post('/form/assigned/volunteer/remove', (req, res) => {
  if (!valid(req.body.formId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'formId' or 'vId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}})-[r:ASSIGNED]-(b:Volunteer {id:{vId}}) delete r', req.body, true);
});

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
