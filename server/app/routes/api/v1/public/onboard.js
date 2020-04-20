import { Router } from 'express';
import { _400, _403 } from '../../../../lib/utils';

module.exports = Router({mergeParams: true})
/**
 * @swagger
 *
 * /public/onboard:
 *   post:
 *     description: Onboard a new volunteer
 *     security:
 *       []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             "$ref": "#/components/schemas/formId_long_lat"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inviteCode:
 *                   type: string
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/err400"
 *       403:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/err403"
 *
 */
.post('/public/onboard', async (req, res) => {
  if (!req.body.formId) return _400(res, "Missing parameter to 'formId'.");
  if (isNaN(req.body.longitude) || isNaN(req.body.latitude)) return _400(res, "Invalid value to parameters 'longitude' or 'latitude'.");

  let reject_msg = "Sorry, no availability in your area right now.";

  // sample rule; TODO: make it db driven
  if (req.body.badinput) return _403(res, reject_msg);

  let turfId, formId;

  let ref = await req.db.query('match (f:Form {id:{formId}, public_onboard:true}) return f.id', req.body);

  if (!ref.data[0]) return _403(res, "Invalid formId");
  formId = ref.data[0];

  ref = await req.db.query('call spatial.withinDistance("turf", {longitude: {longitude}, latitude: {latitude}}, 10) yield node as t where t.noautoturf is null with t limit 1 return t.id', req.body);

  if (!ref.data[0]) return _403(res, reject_msg);
  turfId = ref.data[0];

  return res.json({inviteCode: formId+','+turfId});
});
