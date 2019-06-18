
import fs from 'fs';
import { expect } from 'chai';

import { ov_config } from '../../../../lib/ov_config';
import neo4j from '../../../../lib/neo4j';
import { appInit, base_uri, getObjs, sm_oauth } from '../../../../test/lib/utils';

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

  it('create malformed geometry', async () => {
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

  // list

  // list/byposition

  // assigned/team/list

  // assigned/team/add

  // assigned/team/remove

  // assigned/volunteer/list

  // assigned/volunteer/add

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
