
import fetch from 'node-fetch';
import { deepCopy } from 'ourvoiceusa-sdk-js';

import {
  volunteerAssignments,
  _400, _401, _500
} from '../../../lib/utils';

import { ov_config } from '../../../lib/ov_config';
import { version } from '../../../../package.json';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.post('/hello', async (req, res) => {
  // they say that time's supposed to heal ya but i ain't done much healin'

  let msg = "Awaiting assignment";
  let ass = await volunteerAssignments(req);
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
      volunteers: (await req.db.query('match (a:Volunteer) return count(a)')).data[0],
      teams: (await req.db.query('match (a:Team) return count(a)')).data[0],
      turfs: (await req.db.query('match (a:Turf) return count(a)')).data[0],
      attributes: (await req.db.query('match (a:Attribute) return count(a)')).data[0],
      forms: (await req.db.query('match (a:Form) return count(a)')).data[0],
      addresses: (await req.db.query('match (a:Address) return count(a)')).data[0],
      dbsize: await req.db.size(),
      version: version,
      neo4j_version: nv,
    });
    else {
      let ass = await volunteerAssignments(req);
      return res.json({
        volunteers: (await req.db.query('match (a:Volunteer {id:{id}})-[:MEMBERS {leader:true}]-(:Team)-[]-(t:Turf) where t.wkt is not null call spatial.intersects("volunteer", t.wkt) yield node return node UNION match (a:Volunteer {id:{id}}) return a as node UNION match (a:Volunteer {id:{id}})-[:MEMBERS]-(:Team)-[:MEMBERS]-(c:Volunteer) return distinct(c) as node', req.user)).data.length,
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
  let ass = await volunteerAssignments(req);
  if (ass.ready || req.user.admin) return res.json({google_maps_key: ov_config.google_maps_key });
  else return _401(res, "No soup for you");
});
