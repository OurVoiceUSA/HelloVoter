
import {
  _400, _403, _500, generateToken, volunteerAssignments
} from '../../../lib/utils';

import crypto from 'crypto';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.post('/qrcodes/create', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  let ref;

  try {
    let token = await generateToken();

    ref = await req.db.query('match (v:Volunteer {id:{id}}) create (qr:QRCode {id: {token}}) create (qr)-[:GENERATED_BY]->(v) set qr.created = timestamp(), qr.name = "Unnamed QR Code" return qr', {id: req.user.id, token});
  } catch (e) {
    return _500(res, e);
  }

  return res.json(ref.data[0]);
})
.get('/qrcodes/list',  async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  let qrcodes = {data:[]};

  try {
    qrcodes = await req.db.query('match (qr:QRCode) return qr');
  } catch (e) {
    return _500(res, e);
  }

  return res.json(qrcodes.data);
})
.get('/qrcodes/get', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  let qrcode = {};

  try {
    let ref = await req.db.query('match (qr:QRCode {id:{id}}) return qr', req.query);
    qrcode = ref.data[0];
    qrcode.ass = await volunteerAssignments(req, 'QRCode', qrcode);
  } catch (e) {
    return _500(res, e);
  }

  return res.json(qrcode);
})
.post('/qrcodes/disable', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  try {
    await req.db.query("match (qr:QRCode {id:{id}}) set qr.disabled = true", req.body);
  } catch(e) {
    return _500(res, e);
  }

  return res.json({});
})

