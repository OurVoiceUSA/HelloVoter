
import {
  _400, _403, _500
} from '../../../../lib/utils';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.post('/public/onboard', async (req, res) => {
  if (!req.body.formId) return _400(res, "Missing parameter to 'formId'.");
  if (!req.body.longitude || !req.body.latitude) return _400(res, "Missing parameter to 'longitude' or 'latitude'.");

  let reject_msg = "Sorry, no availability in your area right now.";

  // sample rule; TODO: make it db driven
  if (req.body.badinput) return _403(res, reject_msg);

  let turfId, formId;

  try {
    let ref = await req.db.query('match (f:Form {id:{formId}, public_onboard:true}) return f', req.body);

    if (!ref.data[0]) return _403(res, "Invalid formId");
    formId = ref.data[0];

    ref = await req.db.query('call spatial.withinDistance("turf", {longitude: {longitude}, latitude: {latitude}}, 10) yield node as t where t.noautoturf is null with t limit 1 return t.id', req.body);

    if (!ref.data[0]) return _403(res, reject_msg);
    turfId = ref.data[0];
  } catch (e) {
    return _500(res, e);
  }

  return res.json({inviteCode: formId+','+turfId});
});
