
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { ov_config } from '../app/lib/ov_config';
import neo4j from '../app/lib/neo4j';
import { appInit, base_uri, getObjs, keep, tpx } from './lib/utils';

var api;
var db;
var c, teams, turfs, forms;

describe('Cleanup', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
    teams = getObjs('teams');
    turfs = getObjs('turfs');
    forms = getObjs('forms');
  });

  after(async () => {
    let fail = false;

    // clean up test volunteers
    if (!keep) {
      await db.query('match (a:Volunteer) where a.id =~ "test:.*" detach delete a');
      let ref = await db.query('match (a) where a.name =~ "'+tpx+'.*" return count(a)');
      if (ref.data[0] !== 0) fail = true;
    }

    db.close();

    expect(fail).to.equal(false);
  });

  (keep?it.skip:it)('delete teams', async () => {
    let r;

    r = await api.post(base_uri+'/team/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/get?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.post(base_uri+'/team/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/get?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  (keep?it.skip:it)('delete turfs', async () => {
    let r;

    r = await api.post(base_uri+'/turf/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/turf/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfs.B.id,
      });
    expect(r.statusCode).to.equal(200);
  });

  (keep?it.skip:it)('delete forms', async () => {
    let r;

    r = await api.post(base_uri+'/form/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: forms.A.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/form/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: forms.B.id,
      });
    expect(r.statusCode).to.equal(200);
  });

  it('bob\'s your uncle', async () => {
    const r = await api.get(base_uri+'/uncle')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.name).to.equal("Bob");
  });

});
