
import supertest from 'supertest';
import defaults from 'superagent-defaults';
import jwt from 'jsonwebtoken';
import fs from 'fs';

import { doExpressInit } from '../../app/createExpressApp';
import { ov_config } from '../../app/lib/ov_config';
import queue from '../../app/lib/queue';

export var base_uri = '/HelloVoterHQ/api/v1/';
export var tpx = "Test ";

export var writeObj = (name, obj) => fs.writeFileSync('./test/'+name+'.json', JSON.stringify(obj));
export var getObjs = (name) => JSON.parse(fs.readFileSync('./test/'+name+'.json'));

export var genName = (name) => tpx+name+' '+Math.ceil(Math.random()*10000000);

export var keep = (process.env.KEEP_TEST_DATA ? true : false);

export function appInit(db) {
  var api;
  if (process.env.TEST_TARGET) {
    api = supertest(process.env.TEST_TARGET);
  } else {
    api = defaults(supertest(doExpressInit(false, db, new queue(db)))).set({host:'localhost'});
  }
  return api;
}

export function testToken(key) {
  let id = Math.ceil(Math.random()*10000000);
  return jwt.sign(JSON.stringify({
    id: 'test:' + id,
    name: "Test User "+id,
    iss: ov_config.jwt_iss,
    aud: 'gotv.ourvoiceusa.org',
    iat: Math.floor(new Date().getTime() / 1000),
    exp: Math.floor(new Date().getTime() / 1000)+604800,
    disclaimer: "THIS IS A TEST TOKEN",
  }), key, {algorithm: 'RS256'});
}
