
import { expect } from 'chai';

import { ov_config } from '../../app/lib/ov_config';
import neo4j from '../../app/lib/neo4j';
import { appInit, base_uri, getObjs } from '../lib/utils';

var api;
var db;
var c, teams, turfs, forms;

describe('New Volunteer Zero Visibility', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
    teams = getObjs('teams');
    turfs = getObjs('turfs');
    forms = getObjs('forms');
  });

  after(async () => {
    db.close();
  });

  // TODO: need to setup some assignments for these tests to be fully valid
  // TODO: need to hit more endpoints

  it('can see only self', async () => {
    let r = await api.get(base_uri+'/volunteer/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(1);
  });

  it('can not list teams', async () => {
    let r = await api.get(base_uri+'/team/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  it('can not list team members', async () => {
    let r = await api.get(base_uri+'/team/members/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);
  });

  it('can not list turfs', async () => {
    let r = await api.get(base_uri+'/turf/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  it('can not list forms', async () => {
    let r = await api.get(base_uri+'/form/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });
});
