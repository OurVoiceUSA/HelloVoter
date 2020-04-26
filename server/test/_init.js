
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import fs from 'fs';

import { ov_config } from '../app/lib/ov_config';
import neo4j from '../app/lib/neo4j';
import { min_neo4j_version } from '../app/lib/utils';
import { appInit, base_uri, genName, testToken, writeObj } from './lib/utils';
import { doDbInit } from '../app/lib/startup';

var api;
var db;
var c = {};
var turfs = {};
var forms = {};
var public_key, private_key;

describe('Database Init', function () {

  before(async () => {
    db = new neo4j(ov_config);
    api = appInit(db);
  });

  after(async () => {
    writeObj('volunteers', c);
    writeObj('turfs', turfs);
    writeObj('forms', forms);
    db.close();
  });

  (ov_config.disable_apoc === false?it:it.skip)('correct database version', async () => {
    let r;

    let arr = (await db.version()).split('.');
    let ver = Number.parseFloat(arr[0]+'.'+arr[1]);

    if (ver < min_neo4j_version) {
      console.warn("Neo4j version "+min_neo4j_version+" or higher is required.");
      process.exit(1);
    }
  });

  it('database has no nodes', async () => {
    await db.query("match (a) detach delete a");
    let ref = await db.query("match (a) return count(a)");
    expect(ref.data[0]).to.equal(0);
  });

  it('database startup tasks', async () => {
    await doDbInit(db);
  });

  it('rsa keys match', async () => {
    public_key = fs.readFileSync('./test/rsa.pub', "utf8");
    private_key = fs.readFileSync('./test/rsa.key', "utf8");

    jwt.verify(testToken(private_key), public_key);
  });

  it('hello 200 admin awaiting assignment', async () => {
    let r;

    let t = testToken(private_key);
    c.admin = jwt.verify(t, public_key);
    c.admin.jwt = t;

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Thanks for your request to join us! You are currently awaiting an assignment.");
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
    let r, t;

    t = testToken(private_key);
    c.bob = jwt.verify(t, public_key);
    c.bob.jwt = t;

    t = testToken(private_key);
    c.sally = jwt.verify(t, public_key);
    c.sally.jwt = t;

    t = testToken(private_key);
    c.rich = jwt.verify(t, public_key);
    c.rich.jwt = t;

    t = testToken(private_key);
    c.jane = jwt.verify(t, public_key);
    c.jane.jwt = t;

    t = testToken(private_key);
    c.mike = jwt.verify(t, public_key);
    c.mike.jwt = t;

    t = testToken(private_key);
    c.han = jwt.verify(t, public_key);
    c.han.jwt = t;

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Thanks for your request to join us! You are currently awaiting an assignment.");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.sally.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Thanks for your request to join us! You are currently awaiting an assignment.");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.rich.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Thanks for your request to join us! You are currently awaiting an assignment.");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.jane.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Thanks for your request to join us! You are currently awaiting an assignment.");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.mike.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Thanks for your request to join us! You are currently awaiting an assignment.");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");

    r = await api.post(base_uri+'/hello')
      .set('Authorization', 'Bearer '+c.han.jwt)
      .send({
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.msg).to.equal("Thanks for your request to join us! You are currently awaiting an assignment.");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");
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

    turfs.C = { name: genName("Turf") };

    r = await api.post(base_uri+'/turf/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: turfs.C.name,
        geometry: JSON.parse(fs.readFileSync('./geojson/UT.geojson')),
      });
    expect(r.statusCode).to.equal(200);
    turfs.C.id = r.body.turfId;
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

  it('test db with DEBUG on', async () => {
    let db = new neo4j({...ov_config, DEBUG: true,});
    await db.query('return timestamp()');
    await db.query('return timestamp({date})', {date: '1970-01-01'});
    db.close();
  });

});
