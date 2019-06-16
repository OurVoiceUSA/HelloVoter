
import {
  cqdo, valid, _400, _403, _500
} from '../../../../lib/http';

const Router = require('express').Router

module.exports = Router({mergeParams: true})
.get('/queue/list', (req, res) => {
  return cqdo(req, res, 'match (a:qq.queueTask)<-[:PROCESSED_BY]-(b) return a, labels(b)[0], b{.id,.name,.filename} order by a.created desc', {}, true);
});
