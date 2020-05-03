import { Router } from 'express';
import _ from 'lodash';

import { valid, _400, _403 } from '../../../lib/utils';

module.exports = Router({mergeParams: true})
.get('/import/required-fields', (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (req.config.enable_geocode) return res.json({count: 3, fields: [1,3,5]}); // things required to call a geocoder
  else return res.json({count: 3, fields: [1,6,7]}); // require street, lat, lng
})
.post('/import', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  if (!valid(req.body.filename)) return _400(res, "Invalid value to parameter 'filename'.");
  if (typeof req.body.attributes !== 'object') return _400(res, "Invalid value to parameter 'attributes'.");

  let ref = await req.db.query('match (a:ImportFile {filename:{filename}}) where a.submitted is not null return count(a)', req.body);
  if (ref[0] !== 0) return _403(res, "Import File already exists.");

  // attributes property stores which order they come in as
  ref = await req.db.query(`match (v:Volunteer {id:{id}})
    create (if:ImportFile {id: randomUUID(), filename:{filename}, created: timestamp(), attributes: {attributes}})
    create (if)-[:IMPORTED_BY]->(v)
      with if
    unwind {attributes} as attr
    match (at:Attribute {name:attr}) merge (if)-[:ATTRIBUTES]->(at)
    return if.id`, _.merge({}, req.body, req.user));

  return res.json({importId: ref[0]});
})
.get('/import/:id', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  let imf = await req.db.query('match (if:ImportFile {id:{id}}) return if', req.params);
  return res.json(imf[0]);
})
.post('/import/:id', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");

  // TODO: verify data[0].length matches attriutes.length+8
  // TODO: verify each attribute exists
  // convert attriutes to part of a cypher query
  let attrq = "";
  let ref = await req.db.query('match (if:ImportFile {id:{id}}) return if.attributes', req.params);
  for (let i = 0; i < ref[0].length; i++) {
    attrq += ',`'+ref[0][i]+'`:r['+(i+8)+']';
  }
  await req.db.query(`
match (if:ImportFile {id:{id}})
with collect(if) as lock call apoc.lock.nodes(lock)
match (if:ImportFile {id:{id}})
unwind {data} as r
create (b:ImportRecord {pid:r[0], street:r[1], unit:r[2], city:r[3], state:r[4], zip:r[5], lng:r[6], lat:r[7]`+attrq+`})
merge (b)-[:FILE]->(if)`,
    _.merge({}, req.body, req.params));

  return res.json({});
})
.put('/import/:id', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");

  let ref = await req.db.query('match (if:ImportFile {id:{id}}) where if.submitted is null set if.submitted = timestamp() return count(if)', req.params);
  if (ref[0] !== 1) return _403(res, "Import File already submitted for processing.");

  let job = await req.qq.queueTask('doProcessImport', 'ImportFile {id:{id}}', req.params);

  return res.json(job);
})
.delete('/import/:id', async (req, res) => {
  // TODO: delete imported records as well
  await req.db.query('match (if:ImportFile {id:{id}}) set if:DeletedImportFile remove if:ImportFile', req.params);
  return res.json({deleted: true})
})
.get('/imports', async (req, res) => {
  if (req.user.admin !== true) return _403(res, "Permission denied.");
  let im = await req.db.query('match (a:ImportFile) return a order by a.created desc', {});
  return res.json({
    count: im.length,
    import: im,
  });
})
