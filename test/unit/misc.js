
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { ov_config } from '../../lib/ov_config';
import neo4j from '../../lib/neo4j';
import { appInit, getUsers, sm_oauth } from '../lib/utils';

var api;
var db;
var c;

describe('MISC endpoints', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getUsers();
  });

  after(async () => {
    db.close();
  });

  it('poke 200 timestamp', async () => {
    const r = await api.get('/poke');
    expect(r.statusCode).to.equal(200);
    expect(r.body.data[0]).to.satisfy(Number.isInteger);
  });

  it('hello 400 no jwt', async () => {
    const r = await api.post('/HelloVoterHQ/api/v1/hello')
    expect(r.statusCode).to.equal(400);
    expect(r.body.error).to.equal(true);
    expect(r.body.msg).to.equal("Missing required header.");
  });

  it('hello 400 bad jwt', async () => {
    let r;

    r = await sm_oauth.post('/jwt')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'OurVoiceUSA/test')
      .send({
        apiKey: "12345678765432",
      });
    expect(r.statusCode).to.equal(200);

    let jwt_bad = r.body.jwt; // this lacks an ID

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+jwt_bad)
    expect(r.statusCode).to.equal(400);
    expect(r.body.error).to.equal(true);
    expect(r.body.msg).to.equal("Your token is missing a required parameter.");
  });

  it('hello 401 wrong jwt algorithm', async () => {
    let jwt_inval = jwt.sign(JSON.stringify({
      sub: 12345,
      id: 12345,
      iss: c.admin.iss,
      iat: Math.floor(new Date().getTime() / 1000)-60,
      exp: Math.floor(new Date().getTime() / 1000)+60,
    }), Math.random().toString());

    const r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+jwt_inval)
    expect(r.statusCode).to.equal(401);
    expect(r.body.error).to.equal(true);
    expect(r.body).to.have.property("msg");
  });

  it('hello 400 invalid params', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        dinfo: {ApplicationName: "MOCHA", Brand: "NODE", BuildNumber: "INFINITY", BundleId: "MOCHA", Carrier: "NODE", DeviceCountr: "SHELL", DeviceId: "TESTDEVICE123", DeviceLocale: "en-us", DeviceName: "MOCHA", FontScale: "10", FreeDiskStorage: "50", Manufacturer: "NODE", Model: "MOCHA", ReadableVersion: "1.2.3", SystemName: "NODE", SystemVersion: "1.2.3", Timezone: "EST", TotalDiskCapacity: "50", TotalMemory: "50", UniqueID: "TESTDEVICE123", UserAgent: "NODE/MOCHA", Version: "1.2.3", Emulator: true, Tablet: false, hasNotch: false, Landscape: false},
        longitude: "abc",
        latitude: "def",
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body.msg).to.equal("Invalid value to parameters 'longitude' and 'latitude'.");

  });

});
