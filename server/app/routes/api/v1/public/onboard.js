
import {
  _400, _403, _500
} from '../../../../lib/utils';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.post('/onboard', async (req, res) => {
  if (!req.body.formId) return _400(res, "Missing parameter to 'formId'.");
  if (!req.body.longitude || !req.body.latitude) return _400(res, "Missing parameter to 'longitude' or 'latitude'.");

  // sample rule; TODO: make it db driven
  if (req.body.badinput) return res.json({error: true, message: "Sorry, no availability right now."});

  try {
    let ref = await req.db.query('match (f:Form {id:{formId}, public:true}) return f', req.body);

    if (!ref.data) return _403(res, "Invalid formId");

    // do something
  } catch (e) {
    return _500(res, e);
  }

  // stub out reply
  return res.json({error: true, message: "Endpoint is not finished"});

  return res.json({});
});

