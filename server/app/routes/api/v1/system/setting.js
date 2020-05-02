import { Router } from 'express';
import _ from 'lodash';

import { version } from '../../../../../package.json';
import { _403, _404 } from '../../../../lib/utils';

module.exports = Router({mergeParams: true})
/**
 * @swagger
 *
 * /system/info:
 *   get:
 *     description: Get an object describing system information
 *     tags:
 *       - system
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/object"
 */
.get('/system/info', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  return res.json({
    admins: (await req.db.query('match (v:Volunteer {admin:true}) return count(v)'))[0],
    volunteers: (await req.db.query('match (a:Volunteer) return count(a)'))[0],
    turfs: (await req.db.query('match (a:Turf) return count(a)'))[0],
    attributes: (await req.db.query('match (at:Attribute) return count(at)'))[0],
    forms: (await req.db.query('match (a:Form) return count(a)'))[0],
    addresses: (await req.db.query('match (a:Address) return count(a)'))[0],
    dbnodes: (await req.db.query('match (n) return count(n)'))[0],
    dbsize: await req.db.size(),
    dbversion: await req.db.version(),
    apiversion: version,
  });
})
/**
 * @swagger
 *
 * /system/setting/{id}:
 *   get:
 *     description: Get system setting by id
 *     tags:
 *       - system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/object"
 *   put:
 *     description: Update a given system setting
 *     tags:
 *       - system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             "$ref": "#/components/schemas/value"
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/empty"
 */
.get('/system/setting/:id', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");
  let ref = await req.db.query('match (ss:SystemSetting {id:{id}}) return ss', req.params);
  if (ref.length === 0) return _404(res, "Setting not found.");
  return res.json(ref[0])
})
.put('/system/setting/:id', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  await req.db.query(`match (ss:SystemSetting {id:{id}})
    set ss.updated = timestamp(),
    ss.value = {value}`,
    _.merge({}, req.body, req.params));

  return res.json({updated: true});
})
/**
 * @swagger
 *
 * /system/settings:
 *   get:
 *     description: Get an array of system settings
 *     tags:
 *       - system
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               "$ref": "#/components/schemas/settings"
 */
.get('/system/settings', async (req, res) => {
  if (!req.user.admin) return _403(res, "Permission denied.");

  let settings = await req.db.query(`match (ss:SystemSetting) return ss`);

  return res.json({
    count: settings.length,
    settings,
  });
})
