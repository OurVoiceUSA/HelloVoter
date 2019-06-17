
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { ov_config } from '../../lib/ov_config';
import neo4j from '../../lib/neo4j';
import { appInit, getUsers, sm_oauth } from '../lib/utils';

var api;
var db;
var c;

describe('Volunteer Endpoints', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getUsers();
  });

  after(async () => {
    db.close();
  });

  // TODO: check admin full list vs. non-admin only see your own team

  it('volunteer/list 200 array', async () => {
    const r = await api.get('/HelloVoterHQ/api/v1/volunteer/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('array');
  });

  it('volunteer/lock 200 bob', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/volunteer/lock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        id: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
    expect(r.body.msg).to.equal("Your account is locked.");
  });

  it('volunteer/unlock 200 bob', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/volunteer/unlock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        id: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
  });

});
