
import {
  cqdo, valid, _400, _403, _500
} from '../../../lib/utils';

import { ov_config } from '../../../lib/ov_config';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.get('/import/required-fields', (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (ov_config.enable_geocode) res.json([1,3,5]); // things required to call a geocoder
  else return res.json([1,6,7]); // require street, lat, lng
})
.get('/import/list', (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  return cqdo(req, res, 'match (a:ImportFile) return a order by a.created desc', {}, true);
})
.post('/import/begin', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.filename)) return _400(res, "Invalid value to parameter 'filename'.");
  if (typeof req.body.attributes !== 'object') return _400(res, "Invalid value to parameter 'attributes'.");

  // TODO: validate that req.body.filename is a file name
  req.body.id = req.user.id;
  let ref = await req.db.query('match (a:ImportFile {filename:{filename}}) where a.submitted is not null return count(a)', req.body);
  if (ref.data[0] !== 0) return _403(res, "Import File already exists.");

  // attributes property stores which order they come in as
  await req.db.query('match (a:Volunteer {id:{id}}) merge (b:ImportFile {filename:{filename}}) on create set b += {id: randomUUID(), created: timestamp(), attributes: {attributes}} merge (b)-[:IMPORTED_BY]->(a) with b unwind {attributes} as attr match (a:Attribute {name:attr}) merge (b)-[:ATTRIBUTES]->(a)', req.body);

  return res.json({});
})
.post('/import/add', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.filename)) return _400(res, "Invalid value to parameter 'filename'.");

  // TODO: verify data[0].length matches attriutes.length+8
  // TODO: verify each attribute exists
  // convert attriutes to part of a cypher query
  let attrq = "";
  let ref = await req.db.query('match (a:ImportFile {filename:{filename}}) return a.attributes', req.body);
  for (let i = 0; i < ref.data[0].length; i++) {
    attrq += ',`'+ref.data[0][i]+'`:r['+(i+8)+']';
  }
  await req.db.query(`
match (a:ImportFile {filename:{filename}})
with collect(a) as lock call apoc.lock.nodes(lock)
match (a:ImportFile {filename:{filename}})
unwind {data} as r
create (b:ImportRecord {pid:r[0], street:r[1], unit:r[2], city:r[3], state:r[4], zip:r[5], lng:r[6], lat:r[7]`+attrq+`})
merge (b)-[:FILE]->(a)`,
    req.body);

  return res.json({});
})
.post('/import/end', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.filename)) return _400(res, "Invalid value to parameter 'filename'.");

  let ref = await req.db.query('match (a:ImportFile {filename:{filename}}) where a.submitted is null set a.submitted = timestamp() return count(a)', req.body);
  if (ref.data[0] !== 1) return _403(res, "Import File already submitted for processing.");

  let job = await req.qq.queueTask('doProcessImport', 'ImportFile {filename:{filename}}', {filename: req.body.filename});

  return res.json(job);
});
