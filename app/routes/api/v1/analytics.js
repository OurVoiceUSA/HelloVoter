
import {
  cqdo, valid, _400, _403, _500
} from '../../../lib/utils';

const Router = require('express').Router

module.exports = Router({mergeParams: true})
.get('/analytics/list',  (req, res) => {
  if (!req.query.aId) return _400(res, "Invalid value to parameter 'aId'.");
  return cqdo(req, res, (req.query.turfId?'match (:Turf {id:{turfId}})<-[:WITHIN]-(:Address)':'match (:Address)')+'<-[:AT*0..1]-()<-[:RESIDENCE {current:true}]-(a:Person) '+(req.query.include_null?'optional match':'match')+' (a)<-[:ATTRIBUTE_OF {current:true}]-(b:PersonAttribute)-[:ATTRIBUTE_TYPE]->(:Attribute {id:{aId}}) '+(req.query.include_null?'':'where not b.value = ""')+' with distinct(b.value) as dist, count(*) as count return dist, count order by count desc', req.query, true);
});
