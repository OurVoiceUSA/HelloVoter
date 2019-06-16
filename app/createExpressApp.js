
import express from 'express';
import expressLogging from 'express-logging';
import cors from 'cors';
import logger from 'logops';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';

import { public_key, jwt_iss } from '../lib/pubkey';
import { ov_config } from '../lib/ov_config';

import {
  cqdo, _400, _401, _403, _422, _500
} from '../lib/http';

const router = require('./routes/createRouter.js')();

export function doExpressInit(log, db, qq) {

  // Initialize http server
  const app = express();

  if (log) app.use(expressLogging(logger));

  app.disable('x-powered-by');
  app.disable('etag');
  app.use(bodyParser.json({limit: '5mb'}));
  app.use(cors({exposedHeaders: ['x-sm-oauth-url']}));
  app.use(helmet());

  // require ip_header if config for it is set
  if (!ov_config.DEBUG && ov_config.ip_header) {
    app.use(function (req, res, next) {
      if (!req.header(ov_config.ip_header)) {
        console.log('Connection without '+ov_config.ip_header+' header');
       _400(res, "Missing required header.");
      }
      else next();
    });
  }

  // add req.user if there's a valid JWT
  app.use(async function (req, res, next) {

    if (req.method == 'OPTIONS') return next(); // skip OPTIONS requests

    req.user = {};
    req.db = db;
    req.qq = qq;

    res.set('x-sm-oauth-url', ov_config.sm_oauth_url);

    // uri whitelist
    switch (req.url) {
      case '/':
      case '/poke':
        return next();
      default:
        break;
    }

    try {
      let u;
      if (!req.header('authorization')) return _400(res, "Missing required header.");
      u = jwt.verify(req.header('authorization').split(' ')[1], public_key);

      // verify props
      if (!u.id) return _400(res, "Your token is missing a required parameter.");
      if (u.iss !== jwt_iss) return _403(res, "Your token was issued for a different domain.");

      if (!u.email) u.email = "";
      if (!u.avatar) u.avatar = "";

      let a = await req.db.query('merge (a:Volunteer {id:{id}}) on match set a += {last_seen: timestamp(), name:{name}, email:{email}, avatar:{avatar}} on create set a += {created: timestamp(), last_seen: timestamp(), name:{name}, email:{email}, avatar:{avatar}} return a', u);
      if (a.data.length === 1) {
        req.user = a.data[0];
      } else return _500(res, {});

      if (req.user.locked) return _403(res, "Your account is locked.");

    } catch (e) {
      console.warn(e);
      return _401(res, "Invalid token.");
    }

    next();
  });

  // healtcheck
  app.get('/poke', (req, res) => {
    return cqdo(req, res, 'return timestamp()', false)
  });

  // routes from glob
  app.use('/HelloVoterHQ/api/v1', router);

  return app;
}
