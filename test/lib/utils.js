
import supertest from 'supertest';
import fs from 'fs';

import { doExpressInit } from '../../app/createExpressApp';
import { ov_config } from '../../lib/ov_config';
import queue from '../../lib/queue';

export var base_uri = '/HelloVoterHQ/api/v1/';
export var tpx = "Test ";

export var sm_oauth = supertest(ov_config.sm_oauth_url);

export var writeUsers = (users) => fs.writeFileSync('./test/users.json', JSON.stringify(users));
export var getUsers = () => JSON.parse(fs.readFileSync('./test/users.json'));

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
