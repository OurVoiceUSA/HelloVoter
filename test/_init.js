
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { ov_config } from '../lib/ov_config';
import neo4j from '../lib/neo4j';
import { appInit, base_uri, writeUsers, sm_oauth, tpx } from './lib/utils';

var api;
var db;
var c = {};
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
    writeUsers(c);
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

  it('get users from /tokentest endpoint', async () => {
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

});
