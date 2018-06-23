
var neo4j = require('neo4j-driver').v1;
var BoltAdapter = require('node-neo4j-bolt-adapter');

var should = require('chai').should();
var expect = require('chai').expect;
var supertest = require('supertest');
var api = supertest('http://localhost:8080');
var liveprd = supertest(process.env.BASE_URI_PROD);
var livedev = supertest(process.env.BASE_URI_DEV);

var fs = require('fs');
var jwt_admin;
var jwt_bob;
var jwt_bad;
var jwt_inval;

var authToken;
var db;

let teamName = "I'm a little tea-pot";

describe('API smoke', function () {

  before(async () => {
    let r;

    // clean up test data before we begin
    authToken = neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASS);
    db = new BoltAdapter(neo4j.driver('bolt://'+process.env.NEO4J_HOST, authToken));
    db.cypherQueryAsync('match (a) detach delete a');

    r = await liveprd.post('/auth/jwt')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'OurVoiceUSA/test')
      .send({
        apiKey: "12345678765432",
      });
    expect(r.statusCode).to.equal(200);
    jwt_inval = r.body.jwt;

    r = await livedev.post('/auth/jwt')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'OurVoiceUSA/test')
      .send({
        apiKey: "12345678765432",
      });
    expect(r.statusCode).to.equal(200);
    jwt_bad = r.body.jwt;

    r = await livedev.get('/auth/tokentest');
    expect(r.statusCode).to.equal(200);
    jwt_admin = r.body.jwt;

    r = await livedev.get('/auth/tokentest');
    expect(r.statusCode).to.equal(200);
    jwt_bob = r.body.jwt;

  });

  after(async () => {
    db.close();
  });

  it('poke 200 timestamp', async () => {
    const r = await api.get('/poke');
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');
    expect(r.body.data[0]).to.satisfy(Number.isInteger);
  });

  it('hello 400 no jwt', async () => {
    const r = await api.get('/canvass/v1/hello');
    expect(r.statusCode).to.equal(400);
    expect(r.body.error).to.equal(true);
    expect(r.body.msg).to.equal("Missing required header.");
  });

  it('hello 400 bad jwt', async () => {
    const r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_bad);
    expect(r.statusCode).to.equal(400);
    expect(r.body.error).to.equal(true);
    expect(r.body.msg).to.equal("Your token is missing a required parameter.");
  });

  it('hello 401 invalid jwt', async () => {
    const r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_inval);
    expect(r.statusCode).to.equal(401);
    expect(r.body.error).to.equal(true);
    expect(r.body).to.have.property("msg");
  });

  it('hello 200 admin awaiting assignment', async () => {
    const r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_admin);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body).to.have.property("msg");
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data).to.have.property("ready");
    expect(r.body.data.ready).to.equal(false);
  });

  it('hello 200 bob awaiting assignment', async () => {
    const r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_bob);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body).to.have.property("msg");
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data).to.have.property("ready");
    expect(r.body.data.ready).to.equal(false);
  });

  // TODO: check admin full list vs. non-admin only see your own team

  it('canvasser/list 200 array', async () => {
    const r = await api.get('/canvass/v1/canvasser/list')
      .set('Authorization', 'Bearer '+jwt_admin);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');
  });

  // TODO: lock a user from above, make sure that user gets a 403, unlock it, then 200

  it('canvasser/lock 200 array', async () => {
    const r = await api.post('/canvass/v1/canvasser/lock')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        id: "12345678765432",
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');
  });

  it('canvasser/unlock 200 array', async () => {
    const r = await api.post('/canvass/v1/canvasser/unlock')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        id: "12345678765432",
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');
  });

  // TODO: check admin full list vs. non-admin only see your own teams

  it('team/list 200 array', async () => {
    const r = await api.get('/canvass/v1/team/list')
      .set('Authorization', 'Bearer '+jwt_admin);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');
  });

  it('team/create 400 invalid characters', async () => {
    const r = await api.post('/canvass/v1/team/create')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        name: "_",
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.have.property("error");
  });

  // TODO: list to check that it's there, and again to see it missing

  it('team/create team/delete', async () => {
    let r;

    r = await api.post('/canvass/v1/team/create')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        name: teamName,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');

    r = await api.post('/canvass/v1/team/create')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        name: teamName,
      });
    expect(r.statusCode).to.equal(500);
    expect(r.body.error).to.equal(true);
    expect(r.body.msg).to.be.an('string');

    r = await api.post('/canvass/v1/team/delete')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        name: teamName,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');

  });

  // TODO: check admin full list vs. non-admin only see your own teams

  it('team/member/list 200 array', async () => {
    const r = await api.get('/canvass/v1/team/members/list?teamName='+teamName)
      .set('Authorization', 'Bearer '+jwt_admin);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');
  });

});

