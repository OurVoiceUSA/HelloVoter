
import { expect } from 'chai';

import { ov_config } from '../../../../lib/ov_config';
import neo4j from '../../../../lib/neo4j';
import { appInit, base_uri, getObjs, sm_oauth } from '../../../../test/lib/utils';

var api;
var db;
var c, teams, turfs, forms;

describe('Team', function () {

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

  it('list team members as admin', async () => {
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

  it('list team members as non-admin', async () => {
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

  it('add turf invalid parameters', async () => {
    let r;

    r = await api.post(base_uri+'/team/turf/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/team/turf/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('add turf as non-admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/turf/add')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        turfId: turfs.A.id,
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/team/turf/add')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        turfId: turfs.A.id,
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('add turf as admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/turf/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfs.A.id,
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/turf/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfs.B.id,
        teamId: teams.B.id,
      });
    expect(r.statusCode).to.equal(200);
  });

  // turf/list

  it('list turf invalid parameters', async () => {
    let r;

    r = await api.get(base_uri+'/team/turf/list')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(400);

    r = await api.get(base_uri+'/team/turf/list?turfId='+turfs.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(400);
  });

  it('list turf as non-admin', async () => {
    let r;

    r = await api.get(base_uri+'/team/turf/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].id).to.equal(turfs.A.id);

    r = await api.get(base_uri+'/team/turf/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.rich.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].id).to.equal(turfs.B.id);
  });

  it('list turf from other team', async () => {
    let r;

    r = await api.get(base_uri+'/team/turf/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.get(base_uri+'/team/turf/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.rich.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  it('list turf as admin', async () => {
    let r;

    r = await api.get(base_uri+'/team/turf/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].id).to.equal(turfs.A.id);

    r = await api.get(base_uri+'/team/turf/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].id).to.equal(turfs.B.id);
  });

  // form/add

  it('add form invalid parameters', async () => {
    let r;

    r = await api.post(base_uri+'/team/form/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/team/form/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: forms.A.id,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('add form as non-admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/form/add')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        formId: forms.A.id,
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/team/form/add')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        formId: forms.A.id,
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('add form as admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/form/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: forms.A.id,
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/form/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: forms.B.id,
        teamId: teams.B.id,
      });
    expect(r.statusCode).to.equal(200);
  });

  // form/list

  it('list form invalid parameters', async () => {
    let r;

    r = await api.get(base_uri+'/team/form/list')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(400);

    r = await api.get(base_uri+'/team/form/list?formId='+forms.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(400);
  });

  it('list form as non-admin', async () => {
    let r;

    r = await api.get(base_uri+'/team/form/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].id).to.equal(forms.A.id);

    r = await api.get(base_uri+'/team/form/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.rich.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].id).to.equal(forms.B.id);
  });

  it('list form from other team', async () => {
    let r;

    r = await api.get(base_uri+'/team/form/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.get(base_uri+'/team/form/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.rich.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  it('list form as admin', async () => {
    let r;

    r = await api.get(base_uri+'/team/form/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].id).to.equal(forms.A.id);

    r = await api.get(base_uri+'/team/form/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(1);
    expect(r.body.data[0].id).to.equal(forms.B.id);
  });

  // members/demote

  it('demote invalid parameters', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/demote')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/team/members/demote')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('demote as non-leader', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/demote')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/team/members/demote')
      .set('Authorization', 'Bearer '+c.jane.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('demote as admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/demote')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/team/members/promote')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);
  });

  // turf/remove

  it('remove turf invalid parameters', async () => {
    let r;

    r = await api.post(base_uri+'/team/turf/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/team/turf/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('remove turf as non-admin', async () => {
    let r = await api.post(base_uri+'/team/turf/remove')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        teamId: teams.A.id,
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('remove turf as team leader', async () => {
    let r = await api.post(base_uri+'/team/turf/remove')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        teamId: teams.A.id,
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('remove turf as admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/turf/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/turf/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
        turfId: turfs.B.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/turf/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.get(base_uri+'/team/turf/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  // form/remove

  it('remove form invalid parameters', async () => {
    let r;

    r = await api.post(base_uri+'/team/form/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/team/form/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: forms.A.id,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('remove form as non-admin', async () => {
    let r = await api.post(base_uri+'/team/form/remove')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        teamId: teams.A.id,
        formId: forms.A.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('remove form as team leader', async () => {
    let r = await api.post(base_uri+'/team/form/remove')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        teamId: teams.A.id,
        formId: forms.A.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('remove form as admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/form/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
        formId: forms.A.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/form/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
        formId: forms.B.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/form/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.get(base_uri+'/team/form/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  // members/remove

  it('remove team members invalid parameters', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('remove team members as non-admin', async () => {
    let r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('remove team members as team leader', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/members/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(1);
  });

  it('remove team members as other team leader', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        teamId: teams.B.id,
        vId: c.rich.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.get(base_uri+'/team/members/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);
  });

  it('remove team members as admin', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/members/list?teamId='+teams.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
        vId: c.rich.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
        vId: c.jane.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/members/list?teamId='+teams.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);
  });

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

});
