import express from 'express';
import 'express-async-errors';
import swaggerUi from 'swagger-ui-express';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import helmet from 'helmet';
import cors from 'cors';
import fs from 'fs';

import { initSystemSettings, _400, _401, _403, _500 } from './lib/utils';
import swaggerDocumentv1 from './swagger.v1.json';
import { hv_config } from './lib/hv_config';

const router = require('./routes/createRouter.js')();

var jwt_iss = hv_config.jwt_iss;

export async function doExpressInit({db, qq, logger, config = hv_config}) {

  await initSystemSettings(db);

  // Initialize http server
  let app = express();

  app.use(logger);
  app.disable('x-powered-by');
  app.disable('etag');
  app.use(bodyParser.json({limit: '5mb'}));
  app.use(cors({exposedHeaders: ['x-sm-oauth-url']}));
  app.use(helmet());

  if (config.jwt_pub_key) {
    app.public_key = fs.readFileSync(config.jwt_pub_key, "utf8");
  } else {
    console.log("JWT_PUB_KEY not defined, attempting to fetch from "+config.sm_oauth_url+'/pubkey');
    try {
      let res = await fetch(config.sm_oauth_url+'/pubkey');
      jwt_iss = res.headers.get('x-jwt-iss');
      if (res.status !== 200) throw "http code "+res.status;
      app.public_key = await res.text();
    } catch (e) {
      console.log("Unable to read SM_OAUTH_URL "+config.sm_oauth_url);
      console.log(e);
      return {error: true};
    };
  }

  if (config.ip_header) {
    app.use(function (req, res, next) {
      if (!req.header(config.ip_header)) {
        console.log('Connection without '+config.ip_header+' header');
        return _400(res, "Missing required header.");
      }
      next();
    });
  }

  // add req.user if there's a valid JWT
  app.use(async function (req, res, next) {

    if (req.method == 'OPTIONS') return next(); // skip OPTIONS requests

    req.user = {};
    req.config = config;
    req.db = db;
    req.qq = qq;

    res.set('x-sm-oauth-url', config.sm_oauth_url);

    // uri whitelist
    if (req.url.match(/^\/[a-zA-Z0-9/]*\/v1\/public\//)) return next();

    try {
      let u, a; // My Hero Academia
      if (!req.header('authorization')) return _400(res, "Missing required header.");
      let token = req.header('authorization').split(' ')[1];

      if (token.length <= 64) {
        try {
          a = await req.db.query('match (v:Volunteer {apikey:{apikey}}) set v.last_seen = timestamp() return v', {apikey: token});
        } catch (e) {
          return _500(res, e);
        }
      } else {
        u = jwt.verify(token, app.public_key);

        // verify props
        if (!u.id) return _401(res, "Your token is missing a required parameter.");
        if (u.iss !== jwt_iss) return _401(res, "Your token was issued for a different domain.");
        if (u.aud && (
          (config.jwt_aud && u.aud !== config.jwt_aud) ||
          (!config.jwt_aud && u.aud !== req.header('host'))
        )) return _401(res, "Your token has an incorrect audience.");

        if (!u.email) u.email = "";
        if (!u.avatar) u.avatar = "";

        try {
          a = await req.db.query('merge (a:Volunteer {id:{id}}) on match set a += {last_seen: timestamp(), name:{name}, email:{email}, avatar:{avatar}} on create set a += {created: timestamp(), last_seen: timestamp(), name:{name}, email:{email}, avatar:{avatar}} return a', u);
        } catch (e) {
          return _500(res, e);
        }
      }

      if (a.length === 1) {
        req.user = a[0];
      } else return _401(res, "Invalid token.");

      if (req.user.locked) return _403(res, "Your account is locked.");

    } catch (e) {
      console.warn(e);
      return _401(res, "Invalid token.");
    }

    next();
  });

  app.use(config.base_uri+'/v1', router);
  app.use(config.base_uri+'/v1/public/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocumentv1));

  // default error handler
  app.use((err, req, res, next) => {
    return _500(res, err);
  });

  return app;
}
