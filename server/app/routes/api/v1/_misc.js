import { Router } from 'express';
import fetch from 'node-fetch';
import _ from 'lodash';

import { volunteerAssignments, _400, _401 } from '../../../lib/utils';

module.exports = Router({mergeParams: true})
/**
 * @swagger
 *
 * /hello:
 *   post:
 *     description: First call made to the API, returns your assignments.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - "$ref": "#/components/schemas/dinfo"
 *               - "$ref": "#/components/schemas/longitude"
 *               - "$ref": "#/components/schemas/latitude"
 *               - "$ref": "#/components/schemas/inviteCode"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - "$ref": "#/components/schemas/msg"
 *                 - "$ref": "#/components/schemas/data"
 *
 */
.post('/hello', async (req, res) => {
  // they say that time's supposed to heal ya but i ain't done much healin'

  // if this is coming from the mobile app
  if (typeof req.body.dinfo === 'object') {
    // create query save their device info
    let dkeys = ['ApplicationName', 'Brand', 'BuildNumber', 'BundleId', 'Carrier', 'DeviceCountry', 'DeviceId', 'DeviceLocale', 'DeviceName', 'FontScale', 'FreeDiskStorage', 'Manufacturer', 'Model', 'ReadableVersion', 'SystemName', 'SystemVersion', 'Timezone', 'TotalDiskCapacity', 'TotalMemory', 'UniqueID', 'UserAgent', 'Version', 'Emulator', 'Tablet', 'hasNotch', 'Landscape'];
    let dinfo_str = dkeys.map(d => d+':{'+d+'}').join(',');

    let args = _.merge({}, req.body.dinfo);
    args.id = req.user.id;
    args.lng = parseFloat(req.body.longitude);
    args.lat = parseFloat(req.body.latitude);

    // convert null to empty string on device keys
    dkeys.forEach(k => {
      if (!args[k]) args[k] = "";
    });

    await req.db.query('match (v:Volunteer {id:{id}}) merge (b:Device {UniqueID:{UniqueID}}) on create set b += {created: timestamp(), updated: timestamp(), '+dinfo_str+'} on match set b += {updated: timestamp(), '+dinfo_str+'} merge (v)<-[:USED_BY]-(b)', args);

    if (isNaN(args.lng) || isNaN(args.lat)) return _400(res, "Invalid value to parameters 'longitude' and 'latitude'.");

    await req.db.query('match (v:Volunteer {id:{id}}) set v.position = point({longitude: {lng}, latitude: {lat}})', args);

    // if we don't have their location, set it
    if (!req.user.location) {
      try {
        let res = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lon='+args.lng+'&lat='+args.lat);
        let n = await res.json();
        args.str = n.address.city+', '+n.address.state;
        await req.db.query('match (v:Volunteer {id:{id}}) set v.location = point({longitude: {lng}, latitude: {lat}}), v.locationstr = {str}', args);
      } catch (e) {
        console.warn(e);
      }
    }

    // if they have an invite code, check it
    if (req.body.inviteCode) {
      let params = {id: req.user.id, inviteCode: req.body.inviteCode};

      // public_onboard codes have a comma
      if (req.body.inviteCode.match(/,/)) {
        params.formId = req.body.inviteCode.split(',')[0];
        params.turfId = req.body.inviteCode.split(',')[1];
        await req.db.query('match (v:Volunteer {id:{id}}) match (f:Form {id:{formId}, public_onboard:true}) where NOT (f)-[:ASSIGNED]->(v) match (t:Turf {id:{turfId}}) merge (f)-[:ASSIGNED]->(v) merge (t)-[:ASSIGNED]->(v) create (v)-[:SCANNED {created: timestamp()}]->(f) set f.last_onboard = timestamp()', params);
      } else {
        // check inviteCode against QRCode objects and copy assignments to this volunteer
        await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) match (qr)-[:AUTOASSIGN_TO]->(f:Form) merge (f)-[:ASSIGNED]->(v) set qr.last_used = timestamp()', params);
        await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) create (v)-[:SCANNED {created: timestamp()}]->(qr) set qr.last_used = timestamp()', params);
        // turf is either autoturf or direct assignment
        await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.autoturf is null match (qr)-[:AUTOASSIGN_TO]->(t:Turf) merge (t)-[:ASSIGNED]->(v)', params);
        await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.autoturf = true call spatial.withinDistance("turf", {longitude: v.location.longitude, latitude: v.location.latitude}, 10) yield node as t where t.noautoturf is null with v,t limit 1 merge (t)-[:ASSIGNED]->(v)', params);
      }
    }
  }

  let ass;

  ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (ass.ready) ass.msg = "You are assigned turf and ready to volunteer!";
  else ass.msg = "Thanks for your request to join us! You are currently awaiting an assignment.";

  let ref = await req.db.query('match (s:SystemSetting {id:"sundownok"}) return s.value');
  if (ref && ref[0]) ass.sundownok = true;

  return res.json(ass);
})
.get('/public/poke', async (req, res) => {
  // PSA: make sure you ask people in public for their permission before you poke them!
  return res.json({timestamp: (await req.db.query('return timestamp()'))[0]});
})
.get('/uncle', (req, res) => {
  return res.json({name: "Bob"});
})
