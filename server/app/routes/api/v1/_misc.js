
import fetch from 'node-fetch';
import { deepCopy } from 'ourvoiceusa-sdk-js';

import {
  volunteerAssignments,
  _400, _401, _403, _500
} from '../../../lib/utils';

import { ov_config } from '../../../lib/ov_config';
import { version } from '../../../../package.json';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.post('/hello', async (req, res) => {
  // they say that time's supposed to heal ya but i ain't done much healin'

  // if this is coming from the mobile app
  if (typeof req.body.dinfo === 'object') {
    // create query save their device info
    let dkeys = ['ApplicationName', 'Brand', 'BuildNumber', 'BundleId', 'Carrier', 'DeviceCountry', 'DeviceId', 'DeviceLocale', 'DeviceName', 'FontScale', 'FreeDiskStorage', 'Manufacturer', 'Model', 'ReadableVersion', 'SystemName', 'SystemVersion', 'Timezone', 'TotalDiskCapacity', 'TotalMemory', 'UniqueID', 'UserAgent', 'Version', 'Emulator', 'Tablet', 'hasNotch', 'Landscape'];
    let dinfo_str = dkeys.map(d => d+':{'+d+'}').join(',');

    let args = deepCopy(req.body.dinfo);
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
        await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.disable is null match (qr)-[:AUTOASSIGN_TO]->(f:Form) merge (f)-[:ASSIGNED]->(v) set qr.last_used = timestamp()', params);
        await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.disable is null create (v)-[:SCANNED {created: timestamp()}]->(qr) set qr.last_used = timestamp()', params);
        // turf is either autoturf or direct assignment
        await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.disable is null and qr.autoturf is null match (qr)-[:AUTOASSIGN_TO]->(t:Turf) merge (t)-[:ASSIGNED]->(v)', params);
        await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.disable is null and qr.autoturf = true call spatial.withinDistance("turf", {longitude: v.location.longitude, latitude: v.location.latitude}, 10) yield node as t where t.noautoturf is null with v,t limit 1 merge (t)-[:ASSIGNED]->(v)', params);
      }
    }
  }

  let msg = "Thanks for your request to join us! You are currently awaiting an assignment.";
  let ass = {};

  ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (ass.ready)
    msg = "You are assigned turf and ready to volunteer!";

  let ref = await req.db.query('match (s:SystemSetting {id:"sundownok"}) return s.value');
  if (ref.data && ref.data[0]) ass.sundownok = true;

  return res.json({msg: msg, data: ass});
})
.get('/uncle', (req, res) => {
  return res.json({name: "Bob"});
})
.get('/dashboard', async (req, res) => {
  let nv = await req.db.version();
  if (req.user.admin === true) return res.json({
    admins: (await req.db.query('match (v:Volunteer {admin:true}) return count(v)')).data[0],
    volunteers: (await req.db.query('match (a:Volunteer) return count(a)')).data[0],
    turfs: (await req.db.query('match (a:Turf) return count(a)')).data[0],
    attributes: (await req.db.query('match (at:Attribute) return count(at)')).data[0],
    forms: (await req.db.query('match (a:Form) return count(a)')).data[0],
    addresses: (await req.db.query('match (a:Address) return count(a)')).data[0],
    dbsize: await req.db.size(),
    version: version,
    neo4j_version: nv,
  });
  else {
    let ass = await volunteerAssignments(req, 'Volunteer', req.user);
    return res.json({
      admins: (await req.db.query('match (v:Volunteer {admin:true}) return count(v)')).data[0],
      volunteers: (await req.db.query('match (v:Volunteer {id:{id}}) return v', req.user)).data.length,
      turfs: ass.turfs.length,
      attributes: 'N/A',
      forms: ass.forms.length,
      addresses: 'N/A',
      version: (ass.ready?version:null),
      neo4j_version: (ass.ready?nv:null),
    });
  }
})
.get('/google_maps_key', async (req, res) => {
  let ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (ass.ready || req.user.admin) return res.json({google_maps_key: ov_config.google_maps_key });
  else return _401(res, "No soup for you");
});
