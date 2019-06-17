
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import fs from 'fs';

import { ov_config } from '../../lib/ov_config';
import neo4j from '../../lib/neo4j';
import { appInit, base_uri, getUsers, keep, tpx } from '../lib/utils';

var api;
var db;
var c;

var CA = JSON.parse(fs.readFileSync('./geojson/CA.geojson'));
var UT = JSON.parse(fs.readFileSync('./geojson/UT.geojson'));
var CASLDL62 = JSON.parse(fs.readFileSync('./geojson/CA-sldl-62.geojson'));

var teamName1 = tpx+'Team '+Math.ceil(Math.random()*10000000);
var teamName1id;
var turfName1 = tpx+'Turf '+Math.ceil(Math.random()*10000000);
var turfName1id;
var formName1 = tpx+'Form '+Math.ceil(Math.random()*10000000);
var formId1;

var teamName2 = tpx+'Team '+Math.ceil(Math.random()*10000000);
var teamName2id;
var turfName2 = tpx+'Turf '+Math.ceil(Math.random()*10000000);
var turfName2id;
var formName2 = tpx+'Form '+Math.ceil(Math.random()*10000000);

var turfName3 = tpx+'Turf '+Math.ceil(Math.random()*10000000);
var turfName3id;

describe('Assignments & Permissions', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getUsers();
  });

  after(async () => {
    db.close();
  });

  // TODO: check admin full list vs. non-admin only see your own teams

  it('team/list 200 array', async () => {
    const r = await api.get(base_uri+'/team/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data).to.be.an('array');
  });

  // TODO: check admin full list vs. non-admin only see your own teams

  it('team/create & team/members/add team 1', async () => {
    let r;

    r = await api.post(base_uri+'/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: teamName1,
      });
    expect(r.statusCode).to.equal(200);
    teamName1id = r.body.teamId;

    r = await api.post(base_uri+'/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: teamName1,
      });
    expect(r.statusCode).to.equal(500);

    r = await api.get(base_uri+'/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);

  });

  it('team/create & team/members/add team 2', async () => {
    let r;

    r = await api.post(base_uri+'/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: teamName2,
      });
    expect(r.statusCode).to.equal(200);
    teamName2id = r.body.teamId;

    r = await api.get(base_uri+'/team/members/list?teamId='+teamName2id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName2id,
        vId: c.rich.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName2id,
        vId: c.jane.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);

    r = await api.get(base_uri+'/team/members/list?teamId='+teamName2id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);

  });

  it('volunteer/get same team', async () => {
    let r;

    r = await api.get(base_uri+'/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal(c.bob.id);

    r = await api.get(base_uri+'/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.sally.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal(c.bob.id);

    r = await api.get(base_uri+'/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.rich.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.get(base_uri+'/volunteer/get?id='+c.jane.id)
      .set('Authorization', 'Bearer '+c.rich.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal(c.jane.id);

    r = await api.get(base_uri+'/volunteer/get?id='+c.jane.id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

  });

  it('turf/create', async () => {
    let r;

    r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfName1,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfName1,
        geometry: CA,
      });
    expect(r.statusCode).to.equal(200);
    turfName1id = r.body.turfId;

    r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfName2,
        geometry: CASLDL62.geometry,
      });
    expect(r.statusCode).to.equal(200);
    turfName2id = r.body.turfId;

    r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfName3,
        geometry: UT,
      });
    expect(r.statusCode).to.equal(200);
    turfName3id = r.body.turfId;

  });

  it('turf/assigned/volunteer', async () => {
    let r;

    r = await api.get(base_uri+'/turf/assigned/volunteer/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.post(base_uri+'/turf/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.han.id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/turf/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.han.id,
        turfId: turfName2id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/turf/assigned/volunteer/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(1);

  });

  it('turf/assigned/team', async () => {
    let r;

    r = await api.post(base_uri+'/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName2id,
        turfId: turfName2id,
      });
    expect(r.statusCode).to.equal(200);

  });

  it('form/create & form/assigned add', async () => {
    let r;

    r = await api.post(base_uri+'/form/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: formName1,
        attributes: ["013a31db-fe24-4fad-ab6a-dd9d831e72f9"],
      });
    expect(r.statusCode).to.equal(200);
    formId1 = r.body.formId;

    r = await api.post(base_uri+'/form/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: formId1,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/form/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: formId1,
        teamId: teamName2id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/form/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: formId1,
        vId: c.han.id,
      });
    expect(r.statusCode).to.equal(200);

  });

  it('non-admin permission denied', async () => {
    let r;

    r = await api.get(base_uri+'/volunteer/get?id='+c.sally.id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/volunteer/update')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        id: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/volunteer/lock')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        id: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/volunteer/unlock')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        id: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/team/create')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        name: teamName1,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/team/delete')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/team/members/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        vId: c.mike.id,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        vId: c.sally.id,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        name: turfName1,
        geometry: CA,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/turf/delete')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.get(base_uri+'/turf/assigned/team/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        turfId: turfName1id,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/turf/assigned/team/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        teamId: teamName1id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(403);

/*
    r = await api.get(base_uri+'/turf/assigned/volunteer/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);
*/

    r = await api.post(base_uri+'/turf/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        vId: c.mike.id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/turf/assigned/volunteer/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        vId: c.mike.id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.get(base_uri+'/form/get?id='+formId1)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/form/create')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        name: formName1,
        attributes: ["013a31db-fe24-4fad-ab6a-dd9d831e72f9"],
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/form/delete')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.get(base_uri+'/form/assigned/team/list?formId='+formId1)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/form/assigned/team/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/form/assigned/team/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

/*
    r = await api.get(base_uri+'/form/assigned/volunteer/list?formId='+formId1)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);
*/

    r = await api.post(base_uri+'/form/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
        vId: c.mike.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/form/assigned/volunteer/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

  });

  it('non-admin unassigned zero visibility', async () => {
    let r;

    r = await api.get(base_uri+'/volunteer/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(1);

    r = await api.get(base_uri+'/team/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.get(base_uri+'/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.get(base_uri+'/turf/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.get(base_uri+'/form/list?formId='+formId1)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

  });

  (keep?it.skip:it)('turf/assigned/volunteer/remove', async () => {
    let r;

    r = await api.post(base_uri+'/turf/assigned/volunteer/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.han.id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/turf/assigned/volunteer/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

  });

  (keep?it.skip:it)('team/members/remove & team/delete', async () => {
    let r;

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/members/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.post(base_uri+'/team/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/team/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName2id,
      });
    expect(r.statusCode).to.equal(200);

  });

  (keep?it.skip:it)('turf/delete', async () => {
    let r;

    r = await api.get(base_uri+'/turf/assigned/team/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.post(base_uri+'/turf/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/turf/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfName2id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/turf/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfName3id,
      });
    expect(r.statusCode).to.equal(200);

  });

  (keep?it.skip:it)('form/delete', async () => {
    let r;

    r = await api.get(base_uri+'/form/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    let count = r.body.data.length;

    r = await api.post(base_uri+'/form/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: formId1,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/form/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(count-1);

  });

});
