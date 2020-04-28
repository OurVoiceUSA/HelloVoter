import { Router } from 'express';

import { ID_DONOTCALL, ID_NAME, ID_PHONE, ID_PARTY } from '../../../../lib/consts';
import { volunteerAssignments, _400, _403 } from '../../../../lib/utils';

module.exports = Router({mergeParams: true})
/**
 * @swagger
 *
 * /poc/phone/tocall:
 *   post:
 *     description: Get a phone number to call
 *     tags:
 *       - phonebank
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             "$ref": "#/components/schemas/formId"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/formId"
 *
 */
.post('/poc/phone/tocall', async (req, res) => {
  // TODO: real rough endpoint. quick POC. doesn't look at units. lots of issues. meh! HELP ME!!
  if (!req.body.formId) return _400(res, "Invalid value to parameter 'formId'.");
  if (req.body.filter_id) return _400(res, "Invalid parameter 'filter_id'.");

  let ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (!ass.ready) return _403(res, "Volunteer is not assigned.");

  // make sure formId is in ass.forms
  if (ass.forms.map(f => f.id).indexOf(req.body.formId) === -1) return _403(res, "You are not assigned this form.");

  req.body.id = req.user.id;

  // calls per second rate-limit
  let caller_sec_delay = 5;
  let ref = await req.db.query(`match (cq:CallerQueue)-[:CALLER]->(v:Volunteer {id:{id}}) where cq.created > (timestamp()-`+caller_sec_delay+`*1000) return count(cq)`, req.body);
  if (ref.data[0] > 0) {
    console.log("caller_sec_delay rate-limit triggered for volunteer "+req.user.name+" / "+req.user.id);
    return res.json({});
  }

  // calls per hour rate limit
  let max_calls_hour = 120;
  ref = await req.db.query(`match (cq:CallerQueue)-[:CALLER]->(v:Volunteer {id:{id}}) where cq.created > (timestamp()-60*60*1000) return count(cq)`, req.body);
  if (ref.data[0] > max_calls_hour) {
    console.log("max_calls_hour rate-limit triggered for volunteer "+req.user.name+" / "+req.user.id);
    return res.json({});
  }

  let queue_minutes = 5;

  // check for server-side attribute filter
  ref = await req.db.query(`match (f:Form {id: {formId}})-[:PHONE_FILTER]->(at:Attribute) with at limit 1 return at`, req.body);
  if (ref.data[0]) {
    req.body.filter_id = ref.data[0].id;
    req.body.filter_name = ref.data[0].name;
  }

  ref = await req.db.query(`match (f:Form {id: {formId}})
    match (v:Volunteer {id:{id}})<-[:ASSIGNED]-(t:Turf)
      with f, t limit 1
    match (dnc:Attribute {id:"`+ID_DONOTCALL+`"})
    match (t)<-[:WITHIN]-(a:Address)<-[:RESIDENCE {current:true}]-(p:Person)
        where NOT (p)<-[:ATTRIBUTE_OF]-(:PersonAttribute {value:true})-[:ATTRIBUTE_TYPE]->(dnc)
    `+(
      req.body.filter_id?'match (p)<-[:ATTRIBUTE_OF]-(:PersonAttribute)-[:ATTRIBUTE_TYPE]->(:Attribute {id:{filter_id}})':''
    )+`
    optional match (p)<-[:CALL_TARGET]-(cq:CallerQueue) where cq.created > (timestamp()-`+queue_minutes+`*60*1000)
      with p, cq
        where cq is null
    optional match (p)<-[:VISIT_PERSON]-(vi:Visit)-[:VISIT_FORM]->(f)
      with p, collect(vi.status) as visits
        where length(visits) = 0 or (NOT 1 in visits and NOT 2 in visits and NOT 3 in visits)
      with p, rand() as r
      order by r
    match (:Attribute {id:"`+ID_NAME+`"})<-[:ATTRIBUTE_TYPE]-(name:PersonAttribute)-[:ATTRIBUTE_OF {current:true}]->(p)
    match (:Attribute {id:"`+ID_PHONE+`"})<-[:ATTRIBUTE_TYPE]-(phone:PersonAttribute)-[:ATTRIBUTE_OF {current:true}]->(p)
        where length(toString(phone.value)) > 9
      with p, name, phone limit 1
    optional match (:Attribute {id:"`+ID_PARTY+`"})<-[:ATTRIBUTE_TYPE]-(party:PersonAttribute)-[:ATTRIBUTE_OF]->(p)
    return {id: p.id, name: name.value, phone: phone.value, party: party.value}
  `, req.body);

  let tocall = {};
  if (ref.data[0]) {
    req.body.personId = ref.data[0].id;
    // queue this person so they aren't called by someone else for `queue_minutes`
    await req.db.query(`
    match (v:Volunteer {id:{id}})
    match (p:Person {id:{personId}})
    create (cq:CallerQueue {created:timestamp()})
    create (cq)-[:CALL_TARGET]->(p)
    create (cq)-[:CALLER]->(v)
    `, req.body);
    tocall = ref.data[0];
    if (req.body.filter_id) tocall.extra_info = req.body.filter_name;
  }

  return res.json(tocall);
})
/**
 * @swagger
 *
 * /poc/phone/callresult:
 *   post:
 *     description: Post the resulting status of a phone call
 *     tags:
 *       - phonebank
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - "$ref": "#/components/schemas/formId"
 *               - "$ref": "#/components/schemas/personId"
 *               - "$ref": "#/components/schemas/phone"
 *               - "$ref": "#/components/schemas/status"
 *               - "$ref": "#/components/schemas/start"
 *               - "$ref": "#/components/schemas/end"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/formId"
 *
 */
.post('/poc/phone/callresult', async (req, res) => {
  // TODO: this is a hack job of peopleVisitUpdate -- need to merge this into that eventually
  // did this because we aren't using the survey screen, or attrs, or lng/lat, or cold-calling,
  // or doesn't return anything, or queuing for retry failed network transmissions client side,
  // or doesn't directly mark who said it was a wrong number
  let ref = {};

  if (!req.body.formId) return _400(res, "Invalid value to parameter 'formId'.");
  if (!req.body.personId) return _400(res, "Invalid value to parameter 'personId'.");
  if (!req.body.phone) return _400(res, "Invalid value to parameter 'phone'.");

  req.body.status = parseInt(req.body.status);
  req.body.start = parseInt(req.body.start);
  req.body.end = parseInt(req.body.end);

  // 0 = no answer, 1 = it went well, 2 = didn't go well OR do not call, 3 = wrong number
  if (isNaN(req.body.status) || [0,1,2,3].indexOf(req.body.status) === -1) return _400(res, "Invalid value to parameter 'status'.");
  if (isNaN(req.body.start)) return _400(res, "Invalid value to parameter 'start'.");
  if (isNaN(req.body.end)) return _400(res, "Invalid value to parameter 'end'.");

  let ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (!ass.ready) return _403(res, "Volunteer is not assigned.");

  // make sure formId is in ass.forms
  if (ass.forms.map(f => f.id).indexOf(req.body.formId) === -1) return _403(res, "You are not assigned this form.");

  req.body.id = req.user.id;

  ref = await req.db.query(`
  match (v:Volunteer {id:{id}})
  match (p:Person {id:{personId}})
  match (f:Form {id:{formId}})
  create (vi:Visit {
    start: toInteger({start}),
    end: toInteger({end}),
    status: toInt({status}),
    uploaded: timestamp()
  })
  merge (vi)-[:VISIT_VOLUNTEER]->(v)
  merge (vi)-[:VISIT_FORM]->(f)
  merge (vi)-[:VISIT_PERSON]->(p)
  return count(vi)
    `, req.body);

  // handle wrong phone number
  if (req.body.status === 3) await req.db.query(`
    match (:Attribute {id:"7d3466e5-2cee-491e-b3f4-bfea3a4b010a"})<-[:ATTRIBUTE_TYPE]-(:PersonAttribute {value:{phone}})-[r:ATTRIBUTE_OF]->(:Person {id:{personId}})
    set r.current = false, r.updated = timestamp()
  `, req.body);

  // handle donotcall
  if (req.body.donotcall) await req.db.query(`
    match (dnc:Attribute {id:"a23d5959-892d-459f-95fc-9e2ddcf1bbc7"})
    match (p:Person {id:{personId}})
    create (pa:PersonAttribute {value:true})
    create (pa)-[:ATTRIBUTE_TYPE]->(dnc)
    create (pa)-[:ATTRIBUTE_OF {current:true}]->(p)
  `, req.body);

  return res.json({});
})
