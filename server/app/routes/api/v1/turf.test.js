
import fs from 'fs';
import { expect } from 'chai';

import { ov_config } from '../../../lib/ov_config';
import neo4j from '../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';

var api;
var db;
var c, teams, turfs, forms;

describe('Turf', function () {

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
    let r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "*",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create no geometry', async () => {
    let r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "No Geometry",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create non-JSON geometry', async () => {
    let r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfs.A.name,
        geometry: "Not a Geometry",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create top level geojson', async () => {
    let r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "top level geojson",
        geometry: JSON.parse(fs.readFileSync('./geojson/CA-sldl-62.geojson')),
      });
    expect(r.statusCode).to.equal(400);
  });

  // TODO: check polygon that doesn't end where it starts

  (ov_config.disable_spatial===false?it:it.skip)('create malformed geometry', async () => {
    let geom = JSON.parse(fs.readFileSync('./geojson/CA.geojson'));
    geom.coordinates[0].pop();

    let r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "malformed geometry",
        geometry: geom,
      });
    expect(r.statusCode).to.equal(500);
  });

  it('create as non-admin', async () => {
    let r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        name: "non-admin",
        geometry: JSON.parse(fs.readFileSync('./geojson/CA.geojson')),
      });
    expect(r.statusCode).to.equal(403);
  });

  // get

  it('get invalid parameter', async () => {
    let r = await api.get(base_uri+'/turf/get')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);
  });

  it('get as non-admin', async () => {
    let r = await api.get(base_uri+'/turf/get?turfId='+turfs.A.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.not.exist;
  });

  it('get as admin', async () => {
    let r = await api.get(base_uri+'/turf/get?turfId='+turfs.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal(turfs.A.id);
  });

  // list

  it('list as non-admin', async () => {
    let r = await api.get(base_uri+'/turf/list')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  it('list as admin with no geometry', async () => {
    let r = await api.get(base_uri+'/turf/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(2);
    expect(r.body.data[0]).to.not.have.property("geometry");
  });

  it('list as admin with geometry', async () => {
    let r = await api.get(base_uri+'/turf/list?geometry=true')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(2);
    expect(r.body.data[0]).to.have.property("geometry");
  });

  // list/byposition

  it('list byposition no coordinates', async () => {
    let r = await api.get(base_uri+'/turf/list/byposition')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);
  });

  it('list byposition missing coordinate', async () => {
    let r;

    r = await api.get(base_uri+'/turf/list/byposition?longitude=-118.3281370')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);

    r = await api.get(base_uri+'/turf/list/byposition?latitude=33.9208231')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);
  });

  it('list byposition coordinates not a number', async () => {
    let r = await api.get(base_uri+'/turf/list/byposition?longitude=ABC&latitude=DEF')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);
  });

  it('list byposition single turf', async () => {
    let r;

    r = await api.get(base_uri+'/turf/list/byposition?longitude=-116.566483&latitude=35.6430223')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    if (ov_config.disable_spatial === false) {
      expect(r.statusCode).to.equal(200);
      expect(r.body.data.length).to.equal(1);
    } else {
      expect(r.statusCode).to.equal(501);
    }
  });

  it('list byposition turf overlap', async () => {
    let r;

    r = await api.get(base_uri+'/turf/list/byposition?longitude=-118.3281370&latitude=33.9208231')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    if (ov_config.disable_spatial === false) {
      expect(r.statusCode).to.equal(200);
      expect(r.body.data.length).to.equal(2);
    } else {
      expect(r.statusCode).to.equal(501);
    }
  });

  it.skip('list byposition non-admin', async () => {
    let r;

    r = await api.get(base_uri+'/turf/list/byposition?longitude=-116.566483&latitude=35.6430223')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);
  });

  // assigned/team/add

  it('assign a team invalid parameter', async () => {
    let r;

    r = await api.post(base_uri+'/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('assign a team as non-admin', async () => {
    let r = await api.post(base_uri+'/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        teamId: teams.A.id,
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('assign a team as admin', async () => {
    let r;

    r = await api.post(base_uri+'/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.A.id,
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teams.B.id,
        turfId: turfs.B.id,
      });
    expect(r.statusCode).to.equal(200);
  });

  // assigned/team/list

  // assigned/team/remove

  // assigned/volunteer/add

  // assigned/volunteer/list

  // assigned/volunteer/remove

  // delete

  it('delete invalid parameter', async () => {
    const r = await api.post(base_uri+'/turf/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "The Muse",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('delete as non-admin', async () => {
    const r = await api.post(base_uri+'/turf/delete')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        turfId: turfs.A.id,
      });
    expect(r.statusCode).to.equal(403);
  });

});
