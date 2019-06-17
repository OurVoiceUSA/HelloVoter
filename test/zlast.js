
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { ov_config } from '../lib/ov_config';
import neo4j from '../lib/neo4j';
import { appInit, base_uri, getObjs, keep, tpx } from './lib/utils';

var api;
var db;
var c;

describe('Cleanup', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
  });

  after(async () => {
    // clean up test volunteers
    if (!keep)
      await db.query('match (a:Volunteer) where a.id =~ "test:.*" detach delete a');

    db.close();
  });

  // TODO: (keep?it.skip:it)
  it.skip('all test data was deleted', async () => {
    let ref = await db.query('match (a) where a.name =~ "'+tpx+'.*" return count(a)');
    expect(ref.data[0]).to.equal(0);
  });

  it('bob\'s your uncle', async () => {
    const r = await api.get(base_uri+'/uncle')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.name).to.equal("Bob");
  });

});
