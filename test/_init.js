
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import fs from 'fs';

import { ov_config } from '../app/lib/ov_config';
import neo4j from '../app/lib/neo4j';
import { appInit, base_uri, genName, writeObj, sm_oauth, tpx } from './lib/utils';

var api;
var db;
var c = {};
var teams = {};
var turfs = {};
var forms = {};
var public_key;

describe('User Creation', function () {

  before(async () => {
    db = new neo4j(ov_config);

    // clean up test data before we begin
    await db.query('match (a:Volunteer) where a.id =~ "test:.*" detach delete a');
    await db.query('match (a) where a.name =~ "'+tpx+'.*" detach delete a');

    api = appInit(db);
  });

  after(async () => {
    writeObj('volunteers', c);
    writeObj('teams', teams);
    writeObj('turfs', turfs);
    writeObj('forms', forms);
    db.close();
  });

  it('correct database version', async () => {
    let r;

    let arr = (await db.version()).split('.');
    let ver = Number.parseFloat(arr[0]+'.'+arr[1]);

    if (ver < 3.5) {
      console.warn("Neo4j version 3.5 or higher is required.");
      process.exit(1);
    }
  });

  it('get public key', async () => {
    let r = await sm_oauth.get('/pubkey');
    expect(r.statusCode).to.equal(200);
    public_key = r.body.toString();
  });

  it('get volunteers from /tokentest endpoint', async () => {
    let r;

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

  it('hello 200 admin awaiting assignment', async () => {
    let r;

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);

    // make admin an admin
    await db.query('match (a:Volunteer {id:{id}}) set a.admin=true', c.admin);

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.admin).to.equal(true);
  });

  it('hello 200 volunteers awaiting assignment', async () => {
    let r;

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.rich.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.jane.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
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

  it('generate test objects - teams', async () => {
    let r;

    teams.A = { name: genName("Team") };

    r = await api.post(base_uri+'/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: teams.A.name,
      });
    expect(r.statusCode).to.equal(200);
    expect(typeof r.body.teamId).to.equal("string");
    teams.A.id = r.body.teamId;

    teams.B = { name: genName("Team") };

    r = await api.post(base_uri+'/team/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: teams.B.name,
      });
    expect(r.statusCode).to.equal(200);
    expect(typeof r.body.teamId).to.equal("string");
    teams.B.id = r.body.teamId;
  });

  it('generate test objects - turfs', async () => {
    let r;

    turfs.A = { name: genName("Turf") };

    r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfs.A.name,
        geometry: JSON.parse(fs.readFileSync('./geojson/CA.geojson')),
      });
    expect(r.statusCode).to.equal(200);
    turfs.A.id = r.body.turfId;

    turfs.B = { name: genName("Turf") };

    r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfs.B.name,
        geometry: JSON.parse(fs.readFileSync('./geojson/CA-sldl-62.geojson')).geometry,
      });
    expect(r.statusCode).to.equal(200);
    turfs.B.id = r.body.turfId;
  });

  it('generate test objects - forms', async () => {
    let r;

    forms.A = { name: genName("Form") };

    r = await api.post(base_uri+'/form/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: forms.A.name,
        attributes: ["013a31db-fe24-4fad-ab6a-dd9d831e72f9"],
      });
    expect(r.statusCode).to.equal(200);
    forms.A.id = r.body.formId;

    forms.B = { name: genName("Form") };

    r = await api.post(base_uri+'/form/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: forms.B.name,
        attributes: ["013a31db-fe24-4fad-ab6a-dd9d831e72f9"],
      });
    expect(r.statusCode).to.equal(200);
    forms.B.id = r.body.formId;
  });

});
