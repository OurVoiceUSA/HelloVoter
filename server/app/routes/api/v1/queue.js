import { Router } from 'express';

import { _403 } from '../../../lib/utils';

module.exports = Router({mergeParams: true})
.get('/queue', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  let queue = await req.db.query('match (a:QueueTask)<-[:PROCESSED_BY]-(b) return a, labels(b)[0], b{.id,.name,.filename} order by a.created desc', {});
  return res.json({
    count: queue.length,
    queue,
  });
});
