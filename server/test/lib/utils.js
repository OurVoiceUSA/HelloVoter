import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';

import { doExpressInit } from '../../app/createExpressApp';
import { hv_config } from '../../app/lib/hv_config';
import queue from '../../app/lib/queue';

export var keep = (process.env.KEEP_TEST_DATA ? true : false);
export var base_uri = hv_config.base_uri+'/v1';
export var tpx = "Test ";

export var writeObj = (name, obj) => fs.writeFileSync('./test/'+name+'.json', JSON.stringify(obj));
export var getObjs = (name) => JSON.parse(fs.readFileSync('./test/'+name+'.json'));
export var genName = (name) => tpx+name+' '+Math.ceil(Math.random()*10000000);

export async function appInit(db, config = hv_config) {
  return supertest(await doExpressInit({db, qq: new queue(db), logger: (l,m,n) => {n()}, config}));
}

export function testToken(key, admin) {
  let id = Math.ceil(Math.random()*10000000);
  return jwt.sign(JSON.stringify({
    id: 'test:' + id,
    name: "Test "+(admin?"Admin":"User")+" "+id,
    iss: hv_config.jwt_iss,
    aud: 'gotv.ourvoiceusa.org',
    iat: Math.floor(new Date().getTime() / 1000),
    exp: Math.floor(new Date().getTime() / 1000)+604800,
    disclaimer: "THIS IS A TEST TOKEN",
  }), key, {algorithm: 'RS256'});
}

export function isuuid(uuid) {
  if (uuid.match(new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i))) return true;
  return false;
}
