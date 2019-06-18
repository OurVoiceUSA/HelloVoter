
import {
  volunteerAssignments,
  valid, _400, _403, _500
} from '../../../lib/utils';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.get('/address/get/byposition', async (req, res) => {
  // TODO: allow team leader too
  if (req.user.admin !== true) return _403(res, "Permission denied.");

  req.query.longitude = parseFloat(req.query.longitude);
  req.query.latitude = parseFloat(req.query.latitude);
  if (req.query.limit) req.query.limit = parseInt(req.query.limit);
  if (req.query.dist) req.query.dist = parseInt(req.query.dist);

  if (isNaN(req.query.longitude) || isNaN(req.query.latitude)) return _400(res, "Invalid value to parameters 'longitude' and 'latitude'.");

  // TODO: include status from visits via req.query.formId

  // default admin limits
  if (!req.query.limit) req.query.limit = 10000;
  if (!req.query.dist) req.query.dist = 10000;

  let ref = await req.db.query(`
  match (a:Address) using index a:Address(position)
    where distance(a.position, point({longitude: {longitude}, latitude: {latitude}})) < {dist}
    with a, distance(a.position, point({longitude: {longitude}, latitude: {latitude}})) as dist
    order by dist limit {limit}
  `+(req.query.formId?'with a optional match (a)<-[:VISIT_AT]-(v:Visit)-[:VISIT_FORM]->(:Form {id:{formId}}) with a, collect(v) as visits':'')+`
  return collect({
    address: a{longitude:a.position.x,latitude:a.position.y,.id,.street,.city,.state,.zip,.updated},
    visits: `+(req.query.formId?'visits':'[]')+`})
    `, req.query);

  if (ref.data[0].length) return res.json(ref.data[0]);

  return res.json([]);
})
.post('/address/add/location', async (req, res) => {
  req.body.longitude = parseFloat(req.body.longitude);
  req.body.latitude = parseFloat(req.body.latitude);

  if (isNaN(req.body.longitude) || isNaN(req.body.latitude)) return _400(res, "Invalid value to parameters 'longitude' or 'latitude'.");
  if (!req.body.street || !req.body.city || !req.body.state || !req.body.zip) return _400(res, "Invalid value to an address parameter.");

  return addressAdd(req, res);
})
.post('/address/add/unit', async (req, res) => {
  if (!req.body.addressId) return _400(res, "Invalid value to parameter 'addressId'.");
  if (!req.body.unit) return _400(res, "Invalid value to parameter 'unit'.");

  // TODO: ensure no duplicate

  return addressAdd(req, res);
});

async function addressAdd(req, res) {
  if (!ov_config.volunteer_add_new) return _403(res, "Permission denied.");
  if (!req.body.deviceId) return _400(res, "Invalid value to parameter 'deviceId'.");
  if (!req.body.formId) return _400(res, "Invalid value to parameter 'formId'.");

  req.body.id = req.user.id;
  req.body.timestamp = parseInt(req.body.timestamp);

  if (isNaN(req.body.timestamp)) return _400(res, "Invalid value to parameter 'timestamp'.");

  let ass = await volunteerAssignments(req);
  if (!ass.ready) return _403(res, "Volunteer is not assigned.");

  // make sure formId is in ass.forms
  if (ass.forms.map(f => f.id).indexOf(req.body.formId) === -1) return _403(res, "You are not assigned this form.");

  // TODO: make sure this address is in a turf this volunteer can canvass
  // TODO: make sure this addressId doesn't exist

  // create the visit + address
  let ref = await req.db.query(`match (v:Volunteer {id:{id}})<-[:USED_BY]-(d:Device {UniqueID:{deviceId}}), (f:Form {id:{formId}})
  `+(req.body.addressId && req.body.unit?`match (a:Address {id:{addressId}}) create (u:Unit {name:{unit}}) create (u)-[:AT]->(a)`:`create (a:Address {id:apoc.util.md5([toLower({street}), toLower({city}), toLower({state}), substring({zip},0,5)]), created: timestamp(), updated: timestamp(), position: point({longitude: toFloat({longitude}), latitude: toFloat({latitude})}), street: {street}, city: {city}, state: {state}, zip: {zip}})`)+`
  create (vi:Visit {
    start: toInteger({timestamp}),
    end: toInteger({timestamp}),
    status: 3,
    uploaded: timestamp(),
    position: point({longitude: {longitude}, latitude: {latitude}})
  })
  merge (vi)-[:VISIT_DEVICE]->(d)
  merge (vi)-[:VISIT_VOLUNTEER]->(v)
  merge (vi)-[:VISIT_AT]->(`+(req.body.unit?'u':'a')+`)
  merge (vi)-[:VISIT_FORM]->(f)
  return a.id`, req.body);

  if (req.body.addressId && req.body.unit) {
    // no queue job required
  } else {
    // enqueue job to add address to "address" spatial plugin index & turf
    req.body.addressId = ref.data[0];
    await req.qq.queueTask('doAddAddress', 'Address {id:{addressId}}', req.body);
  }

  // TODO return ... something? :)
  return res.json([]);
}
