import { Router } from 'express';
import crypto from 'crypto';

import { valid, _400, _403, generateToken, volunteerAssignments } from '../../../lib/utils';

module.exports = Router({mergeParams: true})
.post('/qrcode', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  let token = await generateToken({crypto});

  let ref = await req.db.query('match (v:Volunteer {id:{id}}) create (qr:QRCode {id: {token}}) create (qr)-[:GENERATED_BY]->(v) set qr.created = timestamp(), qr.name = "Unnamed QR Code" return qr', {id: req.user.id, token});

  return res.json(ref[0]);
})
.get('/qrcode/:id', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  let ref = await req.db.query('match (qr:QRCode {id:{id}}) optional match (v:Volunteer)-[:SCANNED]->(qr) return qr{.*, num_volunteers: count(distinct(v))}', req.query);
  let qrcode = ref[0];
  qrcode.ass = await volunteerAssignments(req, 'QRCode', qrcode);

  return res.json(qrcode);
})
.put('/qrcode/:id', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'");
  if (!valid(req.body.name) && typeof req.body.autoturf !== 'boolean') return _400(res, "Must provide either 'name' or 'autoturf'");

  if (req.body.name) await req.db.query('match (qr:QRCode {id:{id}}) set qr.name = {name}', req.body);
  if (typeof req.body.autoturf === 'boolean') {
    if (req.body.autoturf === false) req.body.autoturf = null;
    await req.db.query('match (qr:QRCode {id:{id}}) set qr.autoturf = {autoturf}', req.body);
  }

  return res.json({});
})
.delete('/qrcode/:id', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  await req.db.query("match (qr:QRCode {id:{id}}) set qr:DeletedQRCode remove qr:QRCode", req.body);

  return res.json({});
})
.get('/qrcodes',  async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  let qrcodes = await req.db.query('match (qr:QRCode) return qr');

  return res.json(qrcodes);
})
