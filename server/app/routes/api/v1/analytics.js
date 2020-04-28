import { Router } from 'express';

import { _400, _403 } from '../../../lib/utils';

module.exports = Router({mergeParams: true})
.get('/analytics', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!req.query.aId) return _400(res, "Invalid value to parameter 'aId'.");
  let ref = await req.db.query((req.query.turfId?'match (:Turf {id:{turfId}})<-[:WITHIN]-(:Address)':'match (:Address)')+'<-[:AT*0..1]-()<-[:RESIDENCE {current:true}]-(a:Person) '+(req.query.include_null?'optional match':'match')+' (a)<-[:ATTRIBUTE_OF {current:true}]-(b:PersonAttribute)-[:ATTRIBUTE_TYPE]->(:Attribute {id:{aId}}) '+(req.query.include_null?'':'where not b.value = ""')+' with distinct(b.value) as dist, count(*) as count return dist, count order by count desc', req.query);
  return res.json({
    count: ref.data.length,
    analytics: ref.data,
  });
});
