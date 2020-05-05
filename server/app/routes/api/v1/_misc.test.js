import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';
import { hv_config } from '../../../lib/hv_config';
import neo4j from '../../../lib/neo4j';

var api;
var db;
var nv;
var c, turfs, forms;

describe('MISC endpoints', function () {

  before(async () => {
    db = new neo4j(hv_config);
    nv = await db.version();
    api = await appInit(db);
    c = getObjs('volunteers');
    turfs = getObjs('turfs');
    forms = getObjs('forms');
  });

  after(async () => {
    db.close();
  });

  it('root uri 400', async () => {
    let r = await api.get('/');
    expect(r.statusCode).to.equal(400);
  });

  it('baser_uri 400', async () => {
    let r = await api.get(base_uri);
    expect(r.statusCode).to.equal(400);
  });

  it('public poke 200 timestamp', async () => {
    let r = await api.get(base_uri+'/poke')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.timestamp).to.satisfy(Number.isInteger);
  });

  it('poke 200 timestamp', async () => {
    let r = await api.get(base_uri+'/public/poke');
    expect(r.statusCode).to.equal(200);
    expect(r.body.timestamp).to.satisfy(Number.isInteger);
  });

  it('hello 400 no jwt', async () => {
    const r = await api.post(base_uri+'/hello')
    expect(r.statusCode).to.equal(400);
    expect(r.body.error).to.equal(true);
    expect(r.body.msg).to.equal("Missing required header.");
  });

  it('hello 401 wrong jwt algorithm', async () => {
    let jwt_inval = jwt.sign(JSON.stringify({
      sub: 12345,
      id: 12345,
      iss: c.admin.iss,
      iat: Math.floor(new Date().getTime() / 1000)-60,
      exp: Math.floor(new Date().getTime() / 1000)+60,
    }), Math.random().toString());

    const r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+jwt_inval)
    expect(r.statusCode).to.equal(401);
    expect(r.body.error).to.equal(true);
    expect(r.body).to.have.property("msg");
  });

  it('hello 400 invalid params', async () => {
    let r;

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        dinfo: {ApplicationName: "MOCHA", Brand: "NODE", BuildNumber: "INFINITY", BundleId: "MOCHA", Carrier: "NODE", DeviceCountr: "SHELL", DeviceId: "TESTDEVICE123", DeviceLocale: "en-us", DeviceName: "MOCHA", FontScale: "10", FreeDiskStorage: "50", Manufacturer: "NODE", Model: "MOCHA", ReadableVersion: "1.2.3", SystemName: "NODE", SystemVersion: "1.2.3", Timezone: "EST", TotalDiskCapacity: "50", TotalMemory: "50", UniqueID: "TESTDEVICE123", UserAgent: "NODE/MOCHA", Version: "1.2.3", Emulator: true, Tablet: false, hasNotch: false, Landscape: false},
        longitude: "abc",
        latitude: "def",
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body.msg).to.equal("Invalid value to parameters 'longitude' and 'latitude'.");

  });

  it('hello 401 bad apikey', async () => {
    const r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer foobar')
    expect(r.statusCode).to.equal(401);
    expect(r.body.error).to.equal(true);
    expect(r.body).to.have.property("msg");
  });

  it('hello 200 good apikey admin', async () => {
    await db.query('match (v:Volunteer {id:{id}}) set v.apikey = "foobaradmin"', c.admin);
    const r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer foobaradmin')
    expect(r.statusCode).to.equal(200);
    expect(r.body.admin).to.equal(true);
  });

  it('hello 200 good apikey non-admin', async () => {
    await db.query('match (v:Volunteer {id:{id}}) set v.apikey = "foobar"', c.bob);
    const r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer foobar')
    expect(r.statusCode).to.equal(200);
    expect(r.body.admin).to.not.exist;
  });

});
