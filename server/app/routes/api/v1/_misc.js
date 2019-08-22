
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

  // if they have an invite code, check it
  if (req.body.inviteCode) {
    /* TODO: direct invite
    let code = 'invite:'+req.body.invite;
    // ensure valid invite
    let ref = await req.db.query('match (v:Volunteer {id:{invite}}) return count(v)', {invite: code});
    if (ref.data[0] === 0) return _403(res, "Invalid invite code.");

    // we have a valid code, do the property swap & delete the invite
    await req.db.query('match (s:Volunteer {id:{id}}) match (v:Volunteer {id:{invite}}) set s.tid = s.id set s.id = null set v = s delete s set v.id = v.tid set v.tid = null, v.invited = null', {id: req.user.id, invite: code});
    */

    try {
      // check inviteCode against QRCode objects and copy assignments to this volunteer
      let params = {id: req.user.id, inviteCode: req.body.inviteCode};
      await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.disable is null match (qr)-[:AUTOASSIGN_TO]->(t:Turf) merge (t)-[:ASSIGNED]->(v) set qr.last_used = timestamp()', params);
      await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.disable is null match (qr)-[:AUTOASSIGN_TO]->(f:Form) merge (f)-[:ASSIGNED]->(v) set qr.last_used = timestamp()', params);
      await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.disable is null match (qr)-[:AUTOASSIGN_TO]->(t:Team) merge (t)-[:MEMBERS]->(v) set qr.last_used = timestamp()', params);
      await req.db.query('match (v:Volunteer {id:{id}}) match (qr:QRCode {id:{inviteCode}}) where qr.disable is null create (v)-[:SCANNED {created: timestamp()}]->(qr)', params);
    } catch (e) {
      return _500(res, e);
    }
  }

  let msg = "Thanks for your request to join us! You are currently awaiting an assignment.";
  let ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (ass.ready)
    msg = "You are assigned turf and ready to volunteer!";

  // if this is coming from the mobile app
  if (typeof req.body.dinfo === 'object') {
    try {
      // create query save their device info
      let dinfo_str = ['ApplicationName', 'Brand', 'BuildNumber', 'BundleId', 'Carrier', 'DeviceCountr', 'DeviceId', 'DeviceLocale', 'DeviceName', 'FontScale', 'FreeDiskStorage', 'Manufacturer', 'Model', 'ReadableVersion', 'SystemName', 'SystemVersion', 'Timezone', 'TotalDiskCapacity', 'TotalMemory', 'UniqueID', 'UserAgent', 'Version', 'Emulator', 'Tablet', 'hasNotch', 'Landscape'].map(d => d+':{'+d+'}').join(',');

      let args = deepCopy(req.body.dinfo);
      args.id = req.user.id;
      args.lng = parseFloat(req.body.longitude);
      args.lat = parseFloat(req.body.latitude);

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
    } catch (e) {
      return _500(res, e);
    }
  }

  return res.json({msg: msg, data: ass});
})
.get('/uncle', (req, res) => {
  return res.json({name: "Bob"});
})
.get('/dashboard', async (req, res) => {
  try {
    let nv = await req.db.version();
    if (req.user.admin === true) return res.json({
      admins: (await req.db.query('match (v:Volunteer {admin:true}) return count(v)')).data[0],
      volunteers: (await req.db.query('match (a:Volunteer) return count(a)')).data[0],
      teams: (await req.db.query('match (a:Team) return count(a)')).data[0],
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
        volunteers: (await req.db.query('match (a:Volunteer {id:{id}}) return a as node UNION match (a:Volunteer {id:{id}})-[:MEMBERS]-(:Team)-[:MEMBERS]-(c:Volunteer) return distinct(c) as node', req.user)).data.length,
        teams: ass.teams.length,
        turfs: ass.turfs.length,
        attributes: 'N/A',
        forms: ass.forms.length,
        addresses: 'N/A',
        version: (ass.ready?version:null),
        neo4j_version: (ass.ready?nv:null),
      });
    }
  } catch (e) {
    return _500(res, e);
  }
})
.get('/google_maps_key', async (req, res) => {
  let ass = await volunteerAssignments(req, 'Volunteer', req.user);
  if (ass.ready || req.user.admin) return res.json({google_maps_key: ov_config.google_maps_key });
  else return _401(res, "No soup for you");
});
