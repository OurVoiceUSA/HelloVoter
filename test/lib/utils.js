
import supertest from 'supertest';
import fs from 'fs';

import { doExpressInit } from '../../app/createExpressApp';
import { ov_config } from '../../app/lib/ov_config';
import queue from '../../app/lib/queue';

export var base_uri = '/HelloVoterHQ/api/v1/';
export var tpx = "Test ";

export var sm_oauth = supertest(ov_config.sm_oauth_url);

export var writeObj = (name, obj) => fs.writeFileSync('./test/'+name+'.json', JSON.stringify(obj));
export var getObjs = (name) => JSON.parse(fs.readFileSync('./test/'+name+'.json'));

export var genName = (name) => tpx+name+' '+Math.ceil(Math.random()*10000000);

export var keep = (process.env.KEEP_TEST_DATA ? true : false);

export function appInit(db) {
  var api;
  if (process.env.TEST_TARGET) {
    api = supertest(process.env.TEST_TARGET);
  } else {
    api = supertest(doExpressInit(false, db, new queue(db)));
  }
  return api;
}
