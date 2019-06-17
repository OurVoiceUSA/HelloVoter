
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { ov_config } from '../../../../lib/ov_config';
import neo4j from '../../../../lib/neo4j';
import { appInit, base_uri, getObjs, sm_oauth } from '../../../../test/lib/utils';

var api;
var db;
var c;

describe('Volunteer', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
  });

  after(async () => {
    db.close();
  });

  // list

  it('list volunteers via admin', async () => {
    const r = await api.get(base_uri+'/volunteer/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('array');
    expect(r.body.length).to.equal(7);
  });

  it('list volunteers via non-admin', async () => {
    const r = await api.get(base_uri+'/volunteer/list')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('array');
    expect(r.body.length).to.equal(1);
  });

  // get

  it('get volunteer via admin', async () => {
    const r = await api.get(base_uri+'/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('object');
    expect(r.body.id).to.equal(c.bob.id);
  });

  it('get volunteer via non-admin', async () => {
    const r = await api.get(base_uri+'/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('object');
    expect(r.body.id).to.equal(c.bob.id);
  });

  it('get volunteer permission denied', async () => {
    const r = await api.get(base_uri+'/volunteer/get?id='+c.admin.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

  // update

  it('update volunteer via admin', async () => {
    let r;
    let lng = -98.469764;
    let lat = 39.250758;
    let locationstr = "Nowhere, KS";

    r = await api.post(base_uri+'/volunteer/update')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        id: c.bob.id,
        address: locationstr,
        lng: lng,
        lat: lat,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.locationstr).to.equal(locationstr);
    expect(r.body.location.x).to.equal(lng);
    expect(r.body.location.y).to.equal(lat);
  });

  it('update volunteer via self', async () => {
    let r;
    let lng = -93.504074;
    let lat = 38.4813632;
    let locationstr = "Nowhere, MO";

    r = await api.post(base_uri+'/volunteer/update')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        id: c.bob.id,
        address: locationstr,
        lng: lng,
        lat: lat,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.locationstr).to.equal(locationstr);
    expect(r.body.location.x).to.equal(lng);
    expect(r.body.location.y).to.equal(lat);
  });

  it('update volunteer invalid parameter', async () => {
    let r = await api.post(base_uri+'/volunteer/update')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        address: "Invalid, TX",
      });
    expect(r.statusCode).to.equal(400);
  });

  // lock

  it('lock volunteer', async () => {
    let r;

    r = await api.post(base_uri+'/volunteer/lock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        id: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
    expect(r.body.msg).to.equal("Your account is locked.");
  });

  it('lock volunteer permission denied', async () => {
    let r;

    r = await api.post(base_uri+'/volunteer/lock')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        id: c.admin.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/volunteer/lock')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        id: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.sally.jwt)
    expect(r.statusCode).to.equal(200);
  });

  it('lock volunteer admin permission denied', async () => {
    let r = await api.post(base_uri+'/volunteer/lock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        id: c.admin.id,
      });
    expect(r.statusCode).to.equal(403);
  });

  // unlock

  it('unlock volunteer', async () => {
    let r;

    r = await api.post(base_uri+'/volunteer/unlock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        id: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
  });

  it('unlock volunteer permission denied', async () => {
    let r;

    r = await api.post(base_uri+'/volunteer/unlock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        id: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
  });

  // visit/history

  it('view history for self', async () => {
    let r = await api.get(base_uri+'/volunteer/visit/history?formId=test')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('array');
  });

  it('view history via admin', async () => {
    let r = await api.get(base_uri+'/volunteer/visit/history?id='+c.bob.id+'&formId=test')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('array');
  });

  it('view history permission denied', async () => {
    let r = await api.get(base_uri+'/volunteer/visit/history?id='+c.sally.id+'&formId=test')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
  });

  it('view history no formId', async () => {
    let r = await api.get(base_uri+'/volunteer/visit/history')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(400);
  });

});
