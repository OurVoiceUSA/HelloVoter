
import {
  _volunteersFromCypher, volunteerAssignments, sameTeam, onMyTurf, volunteerIsLeader,
  cqdo, valid, _400, _403, _500
} from '../../../lib/utils';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.post('/team/create', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!valid(req.body.name)) return _400(res, "Invalid value to parameter 'name'.");

  req.body.author_id = req.user.id;

  let ref;

  try {
    ref = await req.db.query('match (a:Volunteer {id:{author_id}}) create (b:Team {id:randomUUID(), created: timestamp(), name:{name}})-[:CREATOR]->(a) return b.id', req.body);
  } catch (e) {
    return _500(res, e);
  }

  return res.json({teamId: ref.data[0]});
})
.get('/team/list', (req, res) => {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Team) return a');
  else
    return cqdo(req, res, 'match (a:Volunteer {id:{id}})-[:MEMBERS]-(b:Team) return b', req.user);
})
.get('/team/get', (req, res) => {
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Team {id:{teamId}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (:Volunteer {id:{id}})-[:MEMBERS]-(a:Team {id:{teamId}}) return a', req.query);
  }
})
.get('/team/members/list', async (req, res) => {
  if (!valid(req.query.teamId)) return _400(res, "Invalid value to parameter 'teamId'.");

  let volunteers = [];

  try {
    if (req.user.admin)
      volunteers = await _volunteersFromCypher(req, 'match (a:Volunteer)-[:MEMBERS]-(b:Team {id:{teamId}}) return a', req.query);
    else {
      req.query.id = req.user.id;
      volunteers = await _volunteersFromCypher(req, 'match (a:Volunteer {id:{id}})-[:MEMBERS]-(b:Team {id:{teamId}}) optional match (b)-[:MEMBERS]-(c:Volunteer) return distinct(c)', req.query);
    }
  } catch (e) {
    return _500(res, e);
  }

  return res.json(volunteers);
})
.post('/team/members/add', async (req, res) => {
  if (!valid(req.body.teamId) || !valid(req.body.vId)) return _400(res, "Invalid value to parameter 'teamId' or 'vId'.");
  if (req.user.admin || (await volunteerIsLeader(req, req.user.id, req.body.teamId) && await onMyTurf(req, req.user.id, req.body.vId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{vId}}), (b:Team {id:{teamId}}) merge (b)-[:MEMBERS]->(a)', req.body);
  return _403(res, "Permission denied.");
})
.post('/team/members/remove', async (req, res) => {
  if (!valid(req.body.teamId) || valid(!req.body.vId)) return _400(res, "Invalid value to parameter 'teamId' or 'vId'.");
  if (req.user.admin || (await volunteerIsLeader(req, req.user.id, req.body.teamId) && await onMyTurf(req, req.user.id, req.body.vId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{vId}})-[r:MEMBERS]-(b:Team {id:{teamId}}) delete r', req.body)
  return _403(res, "Permission denied.");
})
.post('/team/members/promote', async (req, res) => {
  if (!valid(req.body.teamId) || valid(!req.body.vId)) return _400(res, "Invalid value to parameter 'teamId' or 'vId'.");
  if (req.user.admin || (await volunteerIsLeader(req, req.user.id, req.body.teamId) && await onMyTurf(req, req.user.id, req.body.vId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{vId}})-[r:MEMBERS]-(b:Team {id:{teamId}}) set r.leader=true', req.body);
  return _403(res, "Permission denied.");
})
.post('/team/members/demote', async (req, res) => {
  if (!valid(req.body.teamId) || valid(!req.body.vId)) return _400(res, "Invalid value to parameter 'teamId' or 'vId'.");
  if (req.user.admin || (await volunteerIsLeader(req, req.user.id, req.body.teamId) && await onMyTurf(req, req.user.id, req.body.vId)))
    return cqdo(req, res, 'match (a:Volunteer {id:{vId}})-[r:MEMBERS]-(b:Team {id:{teamId}}) set r.leader=null', req.body);
  return _403(res, "Permission denied.");
})
.get('/team/turf/list', (req, res) => {
  if (!valid(req.query.teamId)) return _400(res, "Invalid value to parameter 'teamId'.");
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Turf)-[:ASSIGNED]-(b:Team {id:{teamId}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (a:Turf)-[:ASSIGNED]-(b:Team {id:{teamId}})-[:MEMBERS]-(c:Volunteer {id:{id}}) return a', req.query);
  }
})
.post('/team/turf/add', (req, res) => {
  if (!valid(req.body.teamId) || !valid(req.body.turfId)) return _400(res, "Invalid value to parameter 'teamId' or 'turfId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turfId}}), (b:Team {id:{teamId}}) merge (b)-[:ASSIGNED]->(a)', req.body, true);
})
.post('/team/turf/remove', (req, res) => {
  if (!valid(req.body.teamId) || valid(!req.body.turfId)) return _400(res, "Invalid value to parameter 'teamId' or 'turfId'.");
  return cqdo(req, res, 'match (a:Turf {id:{turfId}})-[r:ASSIGNED]-(b:Team {id:{teamId}}) delete r', req.body, true);
})
.get('/team/form/list', (req, res) => {
  if (!valid(req.query.teamId)) return _400(res, "Invalid value to parameter 'teamId'.");
  if (req.user.admin)
    return cqdo(req, res, 'match (a:Form)-[:ASSIGNED]-(b:Team {id:{teamId}}) return a', req.query);
  else {
    req.query.id = req.user.id;
    return cqdo(req, res, 'match (a:Form)-[:ASSIGNED]-(b:Team {id:{teamId}})-[:MEMBERS]-(c:Volunteer {id:{id}}) return a', req.query);
  }
})
.post('/team/form/add', (req, res) => {
  if (!valid(req.body.teamId) || !valid(req.body.formId)) return _400(res, "Invalid value to parameter 'teamId' or 'formId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}}), (b:Team {id:{teamId}}) merge (b)-[:ASSIGNED]->(a)', req.body, true);
})
.post('/team/form/remove', (req, res) => {
  if (!valid(req.body.teamId) || valid(!req.body.formId)) return _400(res, "Invalid value to parameter 'teamId' or 'formId'.");
  return cqdo(req, res, 'match (a:Form {id:{formId}})-[r:ASSIGNED]-(b:Team {id:{teamId}}) delete r', req.body, true);
})
.post('/team/delete', (req, res) => {
  if (!valid(req.body.teamId)) return _400(res, "Invalid value to parameter 'teamId'.");
  return cqdo(req, res, 'match (a:Team {id:{teamId}}) detach delete a', req.body, true);
});
