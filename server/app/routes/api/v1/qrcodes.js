
import {
  valid, cqdo, _400, _403, _500, generateToken, volunteerAssignments
} from '../../../lib/utils';

import crypto from 'crypto';

import { Router } from 'express';

module.exports = Router({mergeParams: true})
.post('/qrcode/create', async (req, res) => {
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
.get('/qrcode/list',  async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  let qrcodes = {data:[]};

  try {
    qrcodes = await req.db.query('match (qr:QRCode) return qr');
  } catch (e) {
    return _500(res, e);
  }

  return res.json(qrcodes.data);
})
.get('/qrcode/get', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  let qrcode = {};

  try {
    let ref = await req.db.query('match (qr:QRCode {id:{id}}) optional match (v:Volunteer)-[:SCANNED]->(qr) return qr{.*, num_volunteers: count(distinct(v))}', req.query);
    qrcode = ref.data[0];
    qrcode.ass = await volunteerAssignments(req, 'QRCode', qrcode);
  } catch (e) {
    return _500(res, e);
  }

  return res.json(qrcode);
})
.post('/qrcode/update', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  if (!valid(req.body.id)) return _400(res, "Invalid value to parameter 'id'");
  if (!valid(req.body.name) && typeof req.body.autoturf !== 'boolean') return _400(res, "Must provide either 'name' or 'autoturf'");

  try {
    if (req.body.name) await req.db.query('match (qr:QRCode {id:{id}}) set qr.name = {name}', req.body);
    if (typeof req.body.autoturf === 'boolean') {
      if (req.body.autoturf === false) req.body.autoturf = null;
      await req.db.query('match (qr:QRCode {id:{id}}) set qr.autoturf = {autoturf}', req.body);
    }
  } catch (e) {
    return _500(res, e);
  }

  return res.json({});
})
.post('/qrcode/turf/add', async (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.qId)) return _400(res, "Invalid value to parameter 'turfId' or 'qId'.");
  return cqdo(req, res, 'match (t:Turf {id:{turfId}}) match (qr:QRCode {id:{qId}}) merge (qr)-[:AUTOASSIGN_TO]->(t)', req.body);
})
.post('/qrcode/turf/remove', async (req, res) => {
  if (!valid(req.body.turfId) || !valid(req.body.qId)) return _400(res, "Invalid value to parameter 'turfId' or 'qId'.");
  return cqdo(req, res, 'match (t:Turf {id:{turfId}})<-[r:AUTOASSIGN_TO]-(:QRCode {id:{qId}}) delete r', req.body, true);
})
.post('/qrcode/form/add', async (req, res) => {
  if (!valid(req.body.formId) || !valid(req.body.qId)) return _400(res, "Invalid value to parameter 'formId' or 'qId'.");
  return cqdo(req, res, 'match (f:Form {id:{formId}}) match (qr:QRCode {id:{qId}}) merge (qr)-[:AUTOASSIGN_TO]->(f)', req.body);
})
.post('/qrcode/form/remove', async (req, res) => {
  if (!valid(req.body.formId) || !valid(req.body.qId)) return _400(res, "Invalid value to parameter 'formId' or 'qId'.");
  return cqdo(req, res, 'match (f:Form {id:{formId}})<-[r:AUTOASSIGN_TO]-(:QRCode {id:{qId}}) delete r', req.body, true);
})
.post('/qrcode/disable', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  try {
    await req.db.query("match (qr:QRCode {id:{id}}) set qr.disabled = true", req.body);
  } catch(e) {
    return _500(res, e);
  }

  return res.json({});
})
