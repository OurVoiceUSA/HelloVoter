import { expect } from 'chai';
import fs from 'fs';

import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';
import { ov_config } from '../../../lib/ov_config';
import neo4j from '../../../lib/neo4j';

var api;
var db;
var c, turfs, forms;

describe('Turf', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
    turfs = getObjs('turfs');
    forms = getObjs('forms');
  });

  after(async () => {
    db.close();
  });

  // create

  it('create invalid characters', async () => {
    let r = await api.post(base_uri+'/turf')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "*",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create no geometry', async () => {
    let r = await api.post(base_uri+'/turf')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "No Geometry",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create non-JSON geometry', async () => {
    let r = await api.post(base_uri+'/turf')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfs.A.name,
        geometry: "Not a Geometry",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create top level geojson', async () => {
    let r = await api.post(base_uri+'/turf')
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

    let r = await api.post(base_uri+'/turf')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "malformed geometry",
        geometry: geom,
      });
    expect(r.statusCode).to.equal(500);
  });

  it('create as non-admin', async () => {
    let r = await api.post(base_uri+'/turf')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        name: "non-admin",
        geometry: JSON.parse(fs.readFileSync('./geojson/CA.geojson')),
      });
    expect(r.statusCode).to.equal(403);
  });

  // get

  it('get as non-admin', async () => {
    let r = await api.get(base_uri+'/turf/'+turfs.A.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.not.exist;
  });

  it('get as admin', async () => {
    let r = await api.get(base_uri+'/turf/'+turfs.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal(turfs.A.id);
  });

  // update

  // list

  it('list as non-admin', async () => {
    let r = await api.get(base_uri+'/turfs')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.turfs.length).to.equal(0);
  });

  it('list as admin with no geometry', async () => {
    let r = await api.get(base_uri+'/turfs')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.turfs.length).to.equal(Object.keys(turfs).length);
    expect(r.body.turfs[0]).to.not.have.property("geometry");
  });

  it('list as admin with geometry', async () => {
    let r = await api.get(base_uri+'/turfs?geometry=true')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.turfs.length).to.equal(Object.keys(turfs).length);
    expect(r.body.turfs[0]).to.have.property("geometry");
  });

  // list filter byposition

  it('list byposition missing coordinate', async () => {
    let r = await api.get(base_uri+'/turfs?longitude=-118.3281370')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);

    r = await api.get(base_uri+'/turfs?latitude=33.9208231')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);
  });

  it('list byposition coordinates not a number', async () => {
    let r = await api.get(base_uri+'/turfs?longitude=ABC&latitude=DEF')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);
  });

  it('list byposition single turf', async () => {
    let r = await api.get(base_uri+'/turfs?longitude=-116.566483&latitude=35.6430223')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.turfs.length).to.equal(1);
  });

  it('list byposition turf overlap', async () => {
    let r = await api.get(base_uri+'/turfs?longitude=-118.3281370&latitude=33.9208231')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.turfs.length).to.equal(2);
  });

  it.skip('list byposition non-admin', async () => {
    let r = await api.get(base_uri+'/turfs?longitude=-116.566483&latitude=35.6430223')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.turfs.length).to.equal(0);
  });

  // delete

  it('delete as non-admin', async () => {
    const r = await api.delete(base_uri+'/turf/'+turfs.A.id)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
  });

});
