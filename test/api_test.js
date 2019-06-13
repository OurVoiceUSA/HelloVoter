
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import fs from 'fs';

import { cqa, cqc, neo4j_version } from '../lib/neo4j.js';
import { ov_config } from '../lib/ov_config';

var sm_oauth = supertest(ov_config.sm_oauth_url);
var api = supertest('http://localhost:8080');

var keep = (process.env.KEEP_TEST_DATA ? true : false);

var CA = JSON.parse(fs.readFileSync('./geojson/CA.geojson'));
var UT = JSON.parse(fs.readFileSync('./geojson/UT.geojson'));
var CASLDL62 = JSON.parse(fs.readFileSync('./geojson/CA-sldl-62.geojson'));

var c = {};

var tpx = "Test ";

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

describe('API smoke', function () {

  before(async () => {
    let r;

    let arr = (await neo4j_version()).split('.');
    let ver = Number.parseFloat(arr[0]+'.'+arr[1]);

    if (ver < 3.5) {
      console.warn("Neo4j version 3.5 or higher is required.");
      process.exit(1);
    }

    // clean up test data before we begin
    await cqa('match (a:Volunteer) where a.id =~ "test:.*" detach delete a');
    await cqa('match (a) where a.name =~ "'+tpx+'.*" detach delete a');

    r = await sm_oauth.get('/pubkey');
    expect(r.statusCode).to.equal(200);
    let public_key = r.body.toString();

    r = await sm_oauth.get('/tokentest');
    expect(r.statusCode).to.equal(200);
    c.admin = jwt.verify(r.body.jwt, public_key);
    c.admin.jwt = r.body.jwt;

    r = await sm_oauth.get('/tokentest');
    expect(r.statusCode).to.equal(200);
    c.bob = jwt.verify(r.body.jwt, public_key);
    c.bob.jwt = r.body.jwt;

    r = await sm_oauth.get('/tokentest');
    expect(r.statusCode).to.equal(200);
    c.sally = jwt.verify(r.body.jwt, public_key);
    c.sally.jwt = r.body.jwt;

    r = await sm_oauth.get('/tokentest');
    expect(r.statusCode).to.equal(200);
    c.rich = jwt.verify(r.body.jwt, public_key);
    c.rich.jwt = r.body.jwt;

    r = await sm_oauth.get('/tokentest');
    expect(r.statusCode).to.equal(200);
    c.jane = jwt.verify(r.body.jwt, public_key);
    c.jane.jwt = r.body.jwt;

    r = await sm_oauth.get('/tokentest');
    expect(r.statusCode).to.equal(200);
    c.mike = jwt.verify(r.body.jwt, public_key);
    c.mike.jwt = r.body.jwt;

    r = await sm_oauth.get('/tokentest');
    expect(r.statusCode).to.equal(200);
    c.han = jwt.verify(r.body.jwt, public_key);
    c.han.jwt = r.body.jwt;

  });

  after(async () => {
    let ref;

    if (!keep) {
      // clean up test users
      await cqa('match (a:Volunteer) where a.id =~ "test:.*" detach delete a');
      // any left over test data??
      ref = await cqa('match (a) where a.name =~ "'+tpx+'.*" return count(a)');
    }

    cqc();

    if (!keep) {
      // check query after close, so we don't hang the test on failure
      expect(ref.data[0]).to.equal(0);
    }

    // confirm that we're all set
    const r = await api.get('/HelloVoterHQ/api/v1/uncle')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.name).to.equal("Bob");
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

  it('hello 200 admin awaiting assignment', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);

    // make admin an admin
    await cqa('match (a:Volunteer {id:{id}}) set a.admin=true', c.admin);

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.admin).to.equal(true);

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

  it('hello 200 volunteers awaiting assignment', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.rich.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.jane.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.han.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");
  });

  // TODO: check admin full list vs. non-admin only see your own team

  it('volunteer/list 200 array', async () => {
    const r = await api.get('/HelloVoterHQ/api/v1/volunteer/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('array');
  });

  it('volunteer/lock 200 bob', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/volunteer/lock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        id: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
    expect(r.body.msg).to.equal("Your account is locked.");
  });

  it('volunteer/unlock 200 bob', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/volunteer/unlock')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        id: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
  });

  // TODO: check admin full list vs. non-admin only see your own teams

  it('team/list 200 array', async () => {
    const r = await api.get('/HelloVoterHQ/api/v1/team/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data).to.be.an('array');
  });

  it('team/create 400 invalid characters', async () => {
    const r = await api.post('/HelloVoterHQ/api/v1/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "*",
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.have.property("error");
  });

  // TODO: check admin full list vs. non-admin only see your own teams

  it('team/create & team/members/add team 1', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: teamName1,
      });
    expect(r.statusCode).to.equal(200);
    teamName1id = r.body.teamId;

    r = await api.post('/HelloVoterHQ/api/v1/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: teamName1,
      });
    expect(r.statusCode).to.equal(500);

    r = await api.get('/HelloVoterHQ/api/v1/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.post('/HelloVoterHQ/api/v1/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get('/HelloVoterHQ/api/v1/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);

  });

  it('team/create & team/members/add team 2', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: teamName2,
      });
    expect(r.statusCode).to.equal(200);
    teamName2id = r.body.teamId;

    r = await api.get('/HelloVoterHQ/api/v1/team/members/list?teamId='+teamName2id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.post('/HelloVoterHQ/api/v1/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName2id,
        vId: c.rich.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/team/members/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName2id,
        vId: c.jane.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get('/HelloVoterHQ/api/v1/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);

    r = await api.get('/HelloVoterHQ/api/v1/team/members/list?teamId='+teamName2id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(2);

  });

  it('volunteer/get same team', async () => {
    let r;

    r = await api.get('/HelloVoterHQ/api/v1/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal(c.bob.id);

    r = await api.get('/HelloVoterHQ/api/v1/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.sally.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal(c.bob.id);

    r = await api.get('/HelloVoterHQ/api/v1/volunteer/get?id='+c.bob.id)
      .set('Authorization', 'Bearer '+c.rich.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.get('/HelloVoterHQ/api/v1/volunteer/get?id='+c.jane.id)
      .set('Authorization', 'Bearer '+c.rich.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal(c.jane.id);

    r = await api.get('/HelloVoterHQ/api/v1/volunteer/get?id='+c.jane.id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

  });

  it('turf/create', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfName1,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post('/HelloVoterHQ/api/v1/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfName1,
        geometry: CA,
      });
    expect(r.statusCode).to.equal(200);
    turfName1id = r.body.turfId;

    r = await api.post('/HelloVoterHQ/api/v1/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfName2,
        geometry: CASLDL62.geometry,
      });
    expect(r.statusCode).to.equal(200);
    turfName2id = r.body.turfId;

    r = await api.post('/HelloVoterHQ/api/v1/turf/create')
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

    r = await api.get('/HelloVoterHQ/api/v1/turf/assigned/volunteer/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.post('/HelloVoterHQ/api/v1/turf/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.han.id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/turf/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.han.id,
        turfId: turfName2id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get('/HelloVoterHQ/api/v1/turf/assigned/volunteer/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(1);

  });

  it('turf/assigned/team', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName2id,
        turfId: turfName2id,
      });
    expect(r.statusCode).to.equal(200);

  });

  it('form/create & form/assigned add', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/form/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: formName1,
        attributes: ["013a31db-fe24-4fad-ab6a-dd9d831e72f9"],
      });
    expect(r.statusCode).to.equal(200);
    formId1 = r.body.formId;

    r = await api.post('/HelloVoterHQ/api/v1/form/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: formId1,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/form/assigned/team/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: formId1,
        teamId: teamName2id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/form/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: formId1,
        vId: c.han.id,
      });
    expect(r.statusCode).to.equal(200);

  });

  it('non-admin permission denied', async () => {
    let r;

    r = await api.get('/HelloVoterHQ/api/v1/volunteer/get?id='+c.sally.id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/volunteer/update')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        id: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/volunteer/lock')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        id: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/volunteer/unlock')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        id: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/team/create')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        name: teamName1,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/team/delete')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/team/members/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        vId: c.mike.id,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/team/members/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        vId: c.sally.id,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/turf/create')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        name: turfName1,
        geometry: CA,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/turf/delete')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.get('/HelloVoterHQ/api/v1/turf/assigned/team/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/turf/assigned/team/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        turfId: turfName1id,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/turf/assigned/team/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        teamId: teamName1id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(403);

/*
    r = await api.get('/HelloVoterHQ/api/v1/turf/assigned/volunteer/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);
*/

    r = await api.post('/HelloVoterHQ/api/v1/turf/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        vId: c.mike.id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/turf/assigned/volunteer/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        vId: c.mike.id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.get('/HelloVoterHQ/api/v1/form/get?id='+formId1)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/form/create')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        name: formName1,
        attributes: ["013a31db-fe24-4fad-ab6a-dd9d831e72f9"],
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/form/delete')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.get('/HelloVoterHQ/api/v1/form/assigned/team/list?formId='+formId1)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/form/assigned/team/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/form/assigned/team/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(403);

/*
    r = await api.get('/HelloVoterHQ/api/v1/form/assigned/volunteer/list?formId='+formId1)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(403);
*/

    r = await api.post('/HelloVoterHQ/api/v1/form/assigned/volunteer/add')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
        vId: c.mike.id,
      });
    expect(r.statusCode).to.equal(403);

    r = await api.post('/HelloVoterHQ/api/v1/form/assigned/volunteer/remove')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        formId: formId1,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(403);

  });

  it('non-admin unassigned zero visibility', async () => {
    let r;

    r = await api.get('/HelloVoterHQ/api/v1/volunteer/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(1);

    r = await api.get('/HelloVoterHQ/api/v1/team/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.get('/HelloVoterHQ/api/v1/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.get('/HelloVoterHQ/api/v1/turf/list')
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.get('/HelloVoterHQ/api/v1/form/list?formId='+formId1)
      .set('Authorization', 'Bearer '+c.mike.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

  });

  (keep?it.skip:it)('turf/assigned/volunteer/remove', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/turf/assigned/volunteer/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        vId: c.han.id,
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get('/HelloVoterHQ/api/v1/turf/assigned/volunteer/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

  });

  (keep?it.skip:it)('team/members/remove & team/delete', async () => {
    let r;

    r = await api.post('/HelloVoterHQ/api/v1/team/members/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        vId: c.bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/team/members/remove')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
        vId: c.sally.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get('/HelloVoterHQ/api/v1/team/members/list?teamId='+teamName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.length).to.equal(0);

    r = await api.post('/HelloVoterHQ/api/v1/team/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/team/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        teamId: teamName2id,
      });
    expect(r.statusCode).to.equal(200);

  });

  (keep?it.skip:it)('turf/delete', async () => {
    let r;

    r = await api.get('/HelloVoterHQ/api/v1/turf/assigned/team/list?turfId='+turfName1id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.post('/HelloVoterHQ/api/v1/turf/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfName1id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/turf/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfName2id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/HelloVoterHQ/api/v1/turf/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        turfId: turfName3id,
      });
    expect(r.statusCode).to.equal(200);

  });

  (keep?it.skip:it)('form/delete', async () => {
    let r;

    r = await api.get('/HelloVoterHQ/api/v1/form/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    let count = r.body.data.length;

    r = await api.post('/HelloVoterHQ/api/v1/form/delete')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: formId1,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get('/HelloVoterHQ/api/v1/form/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(count-1);

  });

});
