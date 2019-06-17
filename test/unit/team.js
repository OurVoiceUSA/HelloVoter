
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { ov_config } from '../../lib/ov_config';
import neo4j from '../../lib/neo4j';
import { appInit, base_uri, getUsers, sm_oauth } from '../lib/utils';

var api;
var db;
var c;

describe('MISC endpoints', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getUsers();
  });

  after(async () => {
    db.close();
  });

  it('team/create invalid characters', async () => {
    const r = await api.post(base_uri+'/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "*",
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.have.property("error");
  });

  it('team/delete invalid parameter', async () => {
    const r = await api.post(base_uri+'/team/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "The Muse",
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.have.property("error");
  });

});
