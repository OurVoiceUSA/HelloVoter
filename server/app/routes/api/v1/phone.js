import { Router } from 'express';

import { volunteerAssignments, _400, _403 } from '../../../lib/utils';

module.exports = Router({mergeParams: true})
.post('/poc/phone/tocall', async (req, res) => {
  // TODO: real rough endpoint. quick POC. doesn't look at units. lots of issues. meh! HELP ME!!
  if (!req.body.formId) return _400(res, "Invalid value to parameter 'formId'.");

  let ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (!ass.ready) return _403(res, "Volunteer is not assigned.");

  // make sure formId is in ass.forms
  if (ass.forms.map(f => f.id).indexOf(req.body.formId) === -1) return _403(res, "You are not assigned this form.");

  req.body.id = req.user.id;

  let ref = await req.db.query(`match (f:Form {id: {formId}})
    match (v:Volunteer {id:{id}})<-[:ASSIGNED]-(t:Turf)
      with f, t limit 1
    match (dnc:Attribute {id:"a23d5959-892d-459f-95fc-9e2ddcf1bbc7"})
    match (t)<-[:WITHIN]-(a:Address)<-[:RESIDENCE {current:true}]-(p:Person)
      where NOT (p)<-[:VISIT_PERSON]-(:Visit)-[:VISIT_FORM]->(f)
        and NOT (p)<-[:ATTRIBUTE_OF]-(:PersonAttribute {value:true})-[:ATTRIBUTE_TYPE]->(dnc)
      with p, rand() as r
      order by r
    match (:Attribute {id:"013a31db-fe24-4fad-ab6a-dd9d831e72f9"})<-[:ATTRIBUTE_TYPE]-(name:PersonAttribute)-[:ATTRIBUTE_OF]->(p)
    match (:Attribute {id:"7d3466e5-2cee-491e-b3f4-bfea3a4b010a"})<-[:ATTRIBUTE_TYPE]-(phone:PersonAttribute)-[:ATTRIBUTE_OF]->(p)
      with p, name, phone limit 1
    optional match (:Attribute {id:"4a320f76-ef7b-4d73-ae2a-8f4ccf5de344"})<-[:ATTRIBUTE_TYPE]-(party:PersonAttribute)-[:ATTRIBUTE_OF]->(p)
    return {id: p.id, name: name.value, phone: phone.value, party: party.value}
    `, req.body);

  let tocall = {};
  if (ref.data[0]) tocall = ref.data[0];

  return res.json(tocall);
})
