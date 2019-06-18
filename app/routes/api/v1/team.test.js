
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { ov_config } from '../../../../lib/ov_config';
import neo4j from '../../../../lib/neo4j';
import { appInit, base_uri, getObjs, sm_oauth } from '../../../../test/lib/utils';

var api;
var db;
var c;
var teams;

describe('Team', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
    teams = getObjs('teams');
  });

  after(async () => {
    db.close();
  });

  // create

  it('create invalid characters', async () => {
    let r = await api.post(base_uri+'/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "*",
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.have.property("error");
  });

  // list

  it('list teams via admin', async () => {
    let r = await api.get(base_uri+'/team/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(2);
  });

  it('list teams via non-admin', async () => {
    let r = await api.get(base_uri+'/team/list')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  // get

  it('get teams via admin', async () => {
    let r;

    r = await api.get(base_uri+'/team/get?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].name).to.equal(teams.A.name);

    r = await api.get(base_uri+'/team/get?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].name).to.equal(teams.B.name);
  });

  it('get teams via non-admin', async () => {
    let r;

    r = await api.get(base_uri+'/team/get?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.get(base_uri+'/team/get?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.sally.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  // members/add

  it('add volunteers to teams invalid parameters', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.have.property("error");

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.have.property("error");
  });

  it('add volunteers to teams as non-admin', async () => {
    let r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('add volunteers to teams as admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
        vId: c.rich.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
        vId: c.jane.id,
      });
    expect(r.statusCode).to.equal(200);
  });

  // members/list

  it('members/list as admin', async () => {
    let r;

    r = await api.get(base_uri+'/team/members/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);

    r = await api.get(base_uri+'/team/members/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);
  });

  it('members/list as non-admin', async () => {
    let r;

    r = await api.get(base_uri+'/team/members/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);

    r = await api.get(base_uri+'/team/members/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);
  });

  // members/promote

  it('members/promote as admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/promote')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/members/promote')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
        vId: c.rich.id,
      });
    expect(r.statusCode).to.equal(200);
  });

  it('members/promote as non-admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/promote')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/team/members/promote')
      .set('Authorization', 'Bearer '+c.jane.jwt)
      .send({
        teamId: teams.B.id,
        vId: c.jane.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('members/promote invalid parameters', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/promote')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/team/members/promote')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
      });
    expect(r.statusCode).to.equal(400);
  });

  // turf/add

  // turf/list

  // form/add

  // form/list

  // members/demote

  // turf/remove

  // form/remove

  // members/remove

  // delete

  it('delete invalid parameter', async () => {
    const r = await api.post(base_uri+'/team/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "The Muse",
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.have.property("error");
  });

  it('delete teamA and teamB', async () => {
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

});
