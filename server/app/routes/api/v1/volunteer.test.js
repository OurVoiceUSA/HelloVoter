
import { expect } from 'chai';

import { hv_config } from '../../../lib/hv_config';
import neo4j from '../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';

var api;
var db;
var c;
var apikey;
var longitude = -98.469764;
var latitude = 39.250758;
var address = "Nowhere, KS";

describe('Volunteer', function () {

  before(() => {
    db = new neo4j(hv_config);
    api = appInit(db);
    c = getObjs('volunteers');
  });

  after(async () => {
    db.close();
  });

  // list

  it('list volunteers via admin', async () => {
    const r = await api.get(base_uri+'/volunteers')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.volunteers).to.be.an('array');
    expect(r.body.volunteers.length).to.equal(7);
  });

  it('list volunteers via admin with skip and limit', async () => {
    let r = await api.get(base_uri+'/volunteers?limit=2')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.volunteers).to.be.an('array');
    expect(r.body.volunteers.length).to.equal(2);
    let alt = r.body.volunteers[1];

    r = await api.get(base_uri+'/volunteers?start=1&limit=2')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.volunteers).to.be.an('array');
    expect(r.body.volunteers.length).to.equal(2);
    expect(r.body.volunteers[0].id).to.equal(alt.id);
  });

  it('list volunteers via admin with filter', async () => {
    let r = await api.get(base_uri+'/volunteers?filter=Admin')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.volunteers).to.be.an('array');
    expect(r.body.volunteers.length).to.equal(1);
  });

  it('list volunteers via non-admin', async () => {
    const r = await api.get(base_uri+'/volunteers')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.volunteers).to.be.an('array');
    expect(r.body.volunteers.length).to.equal(1);
  });

  // get

  it('get volunteer via admin', async () => {
    const r = await api.get(base_uri+'/volunteer/'+c.bob.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('object');
    expect(r.body.id).to.equal(c.bob.id);
  });

  it('get volunteer via non-admin', async () => {
    const r = await api.get(base_uri+'/volunteer/'+c.bob.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('object');
    expect(r.body.id).to.equal(c.bob.id);
  });

  it('get volunteer permission denied', async () => {
    const r = await api.get(base_uri+'/volunteer/'+c.admin.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

  it('volunteer whoami', async () => {
    const r = await api.get(base_uri+'/volunteer/whoami')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.body.id).to.equal(c.bob.id);
  });

  // update

  it('update volunteer via admin', async () => {
    let r = await api.put(base_uri+'/volunteer/'+c.bob.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ address, longitude, latitude })
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/volunteer/whoami')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.locationstr).to.equal(address);
    expect(r.body.location.x).to.equal(longitude);
    expect(r.body.location.y).to.equal(latitude);
  });

  it('update volunteer via self', async () => {
    let r = await api.put(base_uri+'/volunteer/'+c.sally.id)
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({ address, longitude, latitude })
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/volunteer/whoami')
      .set('Authorization', 'Bearer '+c.sally.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.locationstr).to.equal(address);
    expect(r.body.location.x).to.equal(longitude);
    expect(r.body.location.y).to.equal(latitude);
  });

  it('update volunteer invalid parameter', async () => {
    let r = await api.put(base_uri+'/volunteer/'+c.bob.id)
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        address: "Invalid, TX",
      });
    expect(r.statusCode).to.equal(400);
  });

  // lock

  it('lock volunteer', async () => {
    let r = await api.put(base_uri+'/volunteer/'+c.bob.id+'/lock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
    expect(r.body.msg).to.equal("Your account is locked.");
  });

  it('lock volunteer permission denied', async () => {
    let r = await api.put(base_uri+'/volunteer/'+c.admin.id+'/lock')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);

    r = await api.put(base_uri+'/volunteer/'+c.sally.id+'/lock')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.sally.jwt)
    expect(r.statusCode).to.equal(200);
  });

  it('lock volunteer admin permission denied', async () => {
    let r = await api.put(base_uri+'/volunteer/'+c.admin.id+'/lock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(403);
  });

  // unlock

  it('unlock volunteer', async () => {
    let r = await api.delete(base_uri+'/volunteer/'+c.bob.id+'/lock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
  });

  it('unlock volunteer permission denied', async () => {
    let r = await api.delete(base_uri+'/volunteer/'+c.bob.id+'/lock')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
  });

  // visits

  it('view history for self', async () => {
    let r = await api.get(base_uri+'/volunteer/'+c.bob.id+'/visits?formId=test')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.visits).to.be.an('array');
  });

  it('view history via admin', async () => {
    let r = await api.get(base_uri+'/volunteer/'+c.admin.id+'/visits?formId=test')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.visits).to.be.an('array');
  });

  it('view history permission denied', async () => {
    let r = await api.get(base_uri+'/volunteer/'+c.sally.id+'/visits?formId=test')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
  });

  it('view history no formId', async () => {
    let r = await api.get(base_uri+'/volunteer/'+c.bob.id+'/visits')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(400);
  });

  // apikey management

  it('get no apikey', async () => {
    let r = await api.get(base_uri+'/volunteer/'+c.sally.id+'/apikey')
      .set('Authorization', 'Bearer '+c.sally.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.apikey).to.not.exist;
  });

  it('generate apikey', async () => {
    let r = await api.put(base_uri+'/volunteer/'+c.sally.id+'/apikey')
      .set('Authorization', 'Bearer '+c.sally.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.apikey.length).to.equal(64);
    apikey = r.body.apikey;
  });

  it('test apikey', async () => {
    let r = await api.get(base_uri+'/volunteer/'+c.sally.id+'/apikey')
      .set('Authorization', 'Bearer '+apikey)
    expect(r.statusCode).to.equal(200);
    expect(r.body.apikey).to.equal(apikey);
  });

  it('admin can see another apikey', async () => {
    let r = await api.get(base_uri+'/volunteer/'+c.sally.id+'/apikey')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.apikey).to.equal(apikey);
  });

  it('non-admin can NOT see another apikey', async () => {
    let r = await api.get(base_uri+'/volunteer/'+c.sally.id+'/apikey')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(404);
  });

  it('admin can delete another apikey', async () => {
    let r = await api.delete(base_uri+'/volunteer/'+c.bob.id+'/apikey')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
  });

  it('non-admin can NOT delete another apikey', async () => {
    let r = await api.delete(base_uri+'/volunteer/'+c.sally.id+'/apikey')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(404);
  });

  it('delete apikey', async () => {
    let r = await api.delete(base_uri+'/volunteer/'+c.sally.id+'/apikey')
      .set('Authorization', 'Bearer '+apikey)
    expect(r.statusCode).to.equal(200);
  });

  it('test deleted apikey', async () => {
    let r = await api.get(base_uri+'/volunteer/'+c.sally.id+'/apikey')
      .set('Authorization', 'Bearer '+apikey)
    expect(r.statusCode).to.equal(401);
  });

});
