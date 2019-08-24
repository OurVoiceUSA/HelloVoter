
import {
  volunteerAssignments,
  _400, _403, _422, _500
} from '../../../lib/utils';

import { ov_config } from '../../../lib/ov_config';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.get('/people/get/byposition', async (req, res) => {
  req.query.longitude = parseFloat(req.query.longitude);
  req.query.latitude = parseFloat(req.query.latitude);

  if (isNaN(req.query.longitude) || isNaN(req.query.latitude)) return _400(res, "Invalid value to parameters 'longitude' or 'latitude'.");

  return visitsAndPeople(req, res);
})
.post('/people/get/byposition', async (req, res) => {
  // hack the post to be like a get
  req.query = req.body;

  req.query.longitude = parseFloat(req.query.longitude);
  req.query.latitude = parseFloat(req.query.latitude);

  if (isNaN(req.query.longitude) || isNaN(req.query.latitude)) return _400(res, "Invalid value to parameters 'longitude' or 'latitude'.");

  return visitsAndPeople(req, res);
})
.get('/people/get/byaddress', async (req, res) => {
  if (!req.query.aId) return _400(res, "Invalid value to parameter 'aId'.");

  return visitsAndPeople(req, res);
})
.post('/people/visit/add', async (req, res) => {
  if (!ov_config.volunteer_add_new) return _403(res, "Permission denied.");
  req.addnewperson = true;
  return peopleVisitUpdate(req, res);
})
.post('/people/visit/update', async (req, res) => {
  return peopleVisitUpdate(req, res);
});

async function peopleVisitUpdate(req, res) {
  let ref = {};

  if (!req.body.deviceId) return _400(res, "Invalid value to parameter 'deviceId'.");
  if (!req.body.addressId) return _400(res, "Invalid value to parameter 'addressId'.");
  if (!req.body.formId) return _400(res, "Invalid value to parameter 'formId'.");

  req.body.status = parseInt(req.body.status);
  req.body.start = parseInt(req.body.start);
  req.body.end = parseInt(req.body.end);
  req.body.longitude = parseFloat(req.body.longitude);
  req.body.latitude = parseFloat(req.body.latitude);

  if (isNaN(req.body.status) || [0,1,2,3].indexOf(req.body.status) === -1) return _400(res, "Invalid value to parameter 'status'.");
  if (isNaN(req.body.start)) return _400(res, "Invalid value to parameter 'start'.");
  if (isNaN(req.body.end)) return _400(res, "Invalid value to parameter 'end'.");
  if (isNaN(req.body.longitude)) return _400(res, "Invalid value to parameter 'longitude'.");
  if (isNaN(req.body.latitude)) return _400(res, "Invalid value to parameter 'latitude'.");

  // TODO: make sure start and end aren't wacky (end is before start, or either is newer than now)

  // personId required if they are home or no longer live there
  if ((req.body.status === 1 || req.body.status === 3) && !req.body.personId) return _400(res, "Invalid value to parameter 'personId'.");

  // attrs is required if status is home
  if (req.body.status === 1 && typeof req.body.attrs !== 'object') return _400(res, "Invalid value to parameter 'attrs'.");

  let ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (!ass.ready) return _403(res, "Volunteer is not assigned.");

  // make sure formId is in ass.forms
  if (ass.forms.map(f => f.id).indexOf(req.body.formId) === -1) return _403(res, "You are not assigned this form.");

  try {
    req.body.id = req.user.id;

    if (req.addnewperson) {
      // TODO: require leader permissions

      // ensure this ID doesn't already exist
      let ref = await req.db.query('match (p:Person {id:{personId}}) return count (p)', req.body);

      if (ref.data[0] > 0) return _403(res, "Person already exists.");

      await req.db.query('match (a:Address {id:{addressId}})'+(req.body.unit?'<-[:AT]-(u:Unit {name:{unit}})':'')+' create (p:Person {id:{personId}}) create (p)-[r:RESIDENCE {current:true}]->'+(req.body.unit?'(u)':'(a)'), req.body);
    }

/*
TODO: constrain update to a turf their assigned to, but without creating multiple visits due to multiple assignments
  optional match (t:Turf)-[:ASSIGNED]->(:Team)-[:MEMBERS]->(v)
    with v, collect(t.id) as tt
  optional match (t:Turf)-[:ASSIGNED]->(v)
    with v, tt + collect(t.id) as turfIds
  match (t:Turf) where t.id in turfIds
    with v
  match `+(req.body.personId?'(p:Person {id:{personId}})-[r:RESIDENCE {current:true}]->':'')+(req.body.unit?'(u:Unit {name:{unit}})-[:AT]->':'')+`(a:Address {id:{addressId}})-[:WITHIN]->(t)

...
    with distinct(p) as p, r
*/
    ref = await req.db.query(`
  match (v:Volunteer {id:{id}})
  match `+(req.body.personId?'(p:Person {id:{personId}})-[r:RESIDENCE {current:true}]->':'')+(req.body.unit?'(u:Unit {name:{unit}})-[:AT]->':'')+`(a:Address {id:{addressId}})
  match (d:Device {UniqueID:{deviceId}})-[:USED_BY]->(v),
    (f:Form {id:{formId}})
  create (vi:Visit {
    start: toInteger({start}),
    end: toInteger({end}),
    status: toInt({status}),
    uploaded: timestamp(),
    position: point({longitude: {longitude}, latitude: {latitude}})
  })
  merge (vi)-[:VISIT_DEVICE]->(d)
  merge (vi)-[:VISIT_VOLUNTEER]->(v)
  merge (vi)-[:VISIT_AT]->(`+(req.body.unit?'u':'a')+`)
  merge (vi)-[:VISIT_FORM]->(f)
`+(req.body.personId?`
  merge (vi)-[:VISIT_PERSON]->(p)
`+(req.body.status===3?`
    set r.current = false, r.updated = timestamp()
`:`
    with vi, p
  unwind {attrs} as attr
  match (a:Attribute {id:attr.id})
    optional match (a)<-[:ATTRIBUTE_TYPE]-(:PersonAttribute)-[par:ATTRIBUTE_OF {current:true}]->(p)
      set par.current = false, par.updated = timestamp()
  merge (p)<-[ao:ATTRIBUTE_OF]-(pa:PersonAttribute {value:attr.value})-[:ATTRIBUTE_TYPE]->(a)
    set ao.current = true, a.updated = timestamp()
  merge (vi)-[:VISIT_PATTR]->(pa)
`):'')+`
  return count(vi)
    `, req.body);
  } catch (e) {
    return _500(res, e);
  }

  // if nothing was returned, they had all the right params but it didn't match up with the dataset somehow
  // return the "Unprocessable Entity" http error code
  if (!ref.data[0]) return _422(res, "Query returned no data. Something went wrong with your request.");

  return res.json(ref.data);
}
async function visitsAndPeople(req, res) {
  let ref = {};

  if (!req.query.formId) return _400(res, "Invalid value to parameter 'formId'.");

  if (req.query.limit) req.query.limit = parseInt(req.query.limit);

  req.query.id = req.user.id;
  req.query.visit_status = [0,1,2,3];

  // TODO: set to false if the canvassing mode is avoid places we've been
  let empty_addrs = (req.query.filter_visited?false:true);

  // no value? no key
  if (!req.query.filter_val) req.query.filter_key = null;

  // convert old single filter to multi-filter with single value
  if (req.query.filter_key) req.query.filters = [{id: req.query.filter_key, value: req.query.filter_val}];

  // initialize empty filters if not defined so we can check length below
  if (!req.query.filters) req.query.filters = [];

  // filter out empty filter values
  if (req.query.filters.length) {
    req.query.filters = req.query.filters.filter(f => {
      if (typeof f.value === "object" && f.value.length && f.value.indexOf(null) === -1) return true;
      if (typeof f.value === "boolean") {
        f.value = [f.value];
        return true;
      }
      return false;
    });
  }

  if (req.query.filters.length) {
    // even if empty_addrs, a filter removes this
    empty_addrs = false;
  }

  // default & cap on limit
  if (!req.query.limit || req.query.limit > 1000) req.query.limit = 1000;

  try {

    // get area density to optimize main query with a sane distance limit, based on given node limit & filter count
    req.query.dist = 250;
    let enough = false;

    while (enough === false) {
      // scale up distance
      req.query.dist *= 2;
      let ref = await req.db.query(`match (a:Address) using index a:Address(position) where distance(a.position, point({longitude: {longitude}, latitude: {latitude}})) < {dist} return count(a)`, req.query);
      if (ref.data[0] >= (req.query.limit*(req.query.filters.length+1))) enough = true;
      if (req.query.dist >= 16000) enough = true;
    }

    let q = '';

    if (ov_config.disable_spatial === false) q = `match (v:Volunteer {id:{id}})
  optional match (t:Turf)-[:ASSIGNED]->(:Team)-[:MEMBERS]->(v)
    with v, collect(t.id) as tt
  optional match (t:Turf)-[:ASSIGNED]->(v)
    with tt + collect(t.id) as turfIds
  call spatial.withinDistance("turf", {longitude: {longitude}, latitude: {latitude}}, {dist}) yield node
    where node.id in turfIds
    with node as t limit 4 `;

    // either target an address, or use the address index
    if (req.query.aId) q += `match (a:Address {id:{aId}}) `;
    else q += `match (a:Address) using index a:Address(position) `;

    q += `where `+(ov_config.disable_spatial === false?`(a)-[:WITHIN]->(t) `:``);

    if (!req.query.aId) q += (ov_config.disable_spatial === false?`and `:``)+`distance(a.position, point({longitude: {longitude}, latitude: {latitude}})) < {dist}
  with a, distance(a.position, point({longitude: {longitude}, latitude: {latitude}})) as dist
  order by dist limit {limit} `;

    q += `with distinct(a) as a
  optional match (u:Unit)-[:AT]->(a)
    with a.id as aid, collect(distinct(a))+collect(u) as rs
    unwind rs as r `;

    q += `optional match (p:Person)-[:RESIDENCE {current:true}]->(r) `;

    if (req.query.filters.length)
      q += `where `+req.query.filters.map((f, idx) => {
        req.query['faid'+idx] = f.id;
        return '('+f.value.map((v, vdx) => {
          req.query['faval'+idx+''+vdx] = v;
          return `(r)<-[:RESIDENCE {current:true}]-(:Person)<-[:ATTRIBUTE_OF {current:true}]-(:PersonAttribute {value:{faval`+idx+''+vdx+`}})-[:ATTRIBUTE_TYPE]->(:Attribute {id:{faid`+idx+`}}) `;
        }).join('or ')+') ';
      }).join('and ');

    if (req.query.filter_visited) q += (req.query.filters.length?`and`:`where`)+` not (p)<-[:VISIT_PERSON]-(:Visit)-[:VISIT_FORM]->(:Form {id:{formId}}) `;

    q += `optional match (p)<-[:ATTRIBUTE_OF {current:true}]-(pa:PersonAttribute)-[:ATTRIBUTE_TYPE]->(at:Attribute)
  with aid, r, p, collect({id:at.id, name:at.name, value:pa.value}) as attrs
  with aid, r, collect(p{.*, attrs: attrs}) as people `;

    if (!empty_addrs) q += `where size(people) > 0 or (r)<-[:AT]-(:Unit)`;

    q += `
  optional match (r)<-[:VISIT_AT]-(v:Visit)-[:VISIT_FORM]->(:Form {id:{formId}})
    where v.status in {visit_status}
    with aid, r, people, collect(v) as visits, collect(v.status) as status where not 2 in status or status is null
    with aid, r{.*, visits: visits, people: people} as r
    with aid, CASE WHEN (r.street is null) THEN null ELSE r END as r, collect(CASE WHEN (r.street is null) THEN r ELSE null END) as units
    with aid, collect({address: r, units: units}) as addrs
    with addrs[0].address as a, addrs[1].units as units
    `;

    if (!empty_addrs) q += `where size(a.people) > 0 or size(units) > 0 `;

    q += `return collect({
      address: a{longitude:a.position.x,latitude:a.position.y,.id,.street,.city,.state,.zip,.updated},
      units: CASE WHEN (units is null) THEN [] ELSE units END,
      people: a.people,
      visits: a.visits
    }) as data`;

    ref = await req.db.query(q, req.query);

    if (ref.data[0].length) return res.json(ref.data[0]);

  } catch (e) {
    return _500(res, e);
  }

  return res.json([]);
}
