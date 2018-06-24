
var neo4j = require('neo4j-driver').v1;
var BoltAdapter = require('node-neo4j-bolt-adapter');

var expect = require('chai').expect;
var supertest = require('supertest');
var jwt = require('jsonwebtoken');
var api = supertest('http://localhost:8080');
var sm_oauth = supertest(process.env.URL_SM_OAUTH);

var fs = require('fs');
var admin = {};
var bob = {};
var sally = {};

var authToken;
var db;

describe('API smoke', function () {

  before(async () => {
    let r;

    // clean up test data before we begin
    authToken = neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASS);
    db = new BoltAdapter(neo4j.driver('bolt://'+process.env.NEO4J_HOST, authToken));
    await db.cypherQueryAsync('match (a:Canvasser) where a.id =~ "test:.*" detach delete a');

    r = await sm_oauth.get('/auth/tokentest');
    expect(r.statusCode).to.equal(200);
    admin = jwt.decode(r.body.jwt);
    admin.jwt = r.body.jwt;

    r = await sm_oauth.get('/auth/tokentest');
    expect(r.statusCode).to.equal(200);
    bob = jwt.decode(r.body.jwt);
    bob.jwt = r.body.jwt;

    r = await sm_oauth.get('/auth/tokentest');
    expect(r.statusCode).to.equal(200);
    sally = jwt.decode(r.body.jwt);
    sally.jwt = r.body.jwt;

  });

  after(async () => {
    db.close();

    // confirm that we're all set
    const r = await api.get('/canvass/v1/uncle')
      .set('Authorization', 'Bearer '+admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.name).to.equal("Bob");
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
    let r;

    r = await sm_oauth.post('/auth/jwt')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'OurVoiceUSA/test')
      .send({
        apiKey: "12345678765432",
      });
    expect(r.statusCode).to.equal(200);

    let jwt_bad = r.body.jwt; // this lacks an ID

    r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_bad);
    expect(r.statusCode).to.equal(400);
    expect(r.body.error).to.equal(true);
    expect(r.body.msg).to.equal("Your token is missing a required parameter.");
  });

  it('hello 401 wrong jwt algorithm', async () => {
    let jwt_inval = jwt.sign(JSON.stringify({
      sub: 12345,
      id: 12345,
      iss: admin.iss,
      iat: Math.floor(new Date().getTime() / 1000)-60,
      exp: Math.floor(new Date().getTime() / 1000)+60,
    }), Math.random().toString());

    const r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_inval);
    expect(r.statusCode).to.equal(401);
    expect(r.body.error).to.equal(true);
    expect(r.body).to.have.property("msg");
  });

  it('hello 200 admin awaiting assignment', async () => {
    let r;

    r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body).to.have.property("msg");
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data).to.have.property("ready");
    expect(r.body.data.ready).to.equal(false);

    // make admin an admin
    await db.cypherQueryAsync('match (a:Canvasser {id:{id}}) set a.admin=true', admin);

    r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.admin).to.equal(true);
  });

  it('hello 200 bob awaiting assignment', async () => {
    const r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body).to.have.property("msg");
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");
  });

  it('hello 200 sally awaiting assignment', async () => {
    const r = await api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+sally.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body).to.have.property("msg");
    expect(r.body.msg).to.equal("Awaiting assignment");
    expect(r.body.data.ready).to.equal(false);
    expect(r.body.data).to.not.have.property("admin");
  });

  // TODO: check admin full list vs. non-admin only see your own team

  it('canvasser/list 200 array', async () => {
    const r = await api.get('/canvass/v1/canvasser/list')
      .set('Authorization', 'Bearer '+admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');
  });

  // TODO: lock a user from above, make sure that user gets a 403, unlock it, then 200

  it('canvasser/lock 200 array', async () => {
    const r = await api.post('/canvass/v1/canvasser/lock')
      .set('Authorization', 'Bearer '+admin.jwt)
      .send({
        id: "12345678765432",
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');
  });

  it('canvasser/unlock 200 array', async () => {
    const r = await api.post('/canvass/v1/canvasser/unlock')
      .set('Authorization', 'Bearer '+admin.jwt)
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
      .set('Authorization', 'Bearer '+admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');
  });

  it('team/create 400 invalid characters', async () => {
    const r = await api.post('/canvass/v1/team/create')
      .set('Authorization', 'Bearer '+admin.jwt)
      .send({
        name: "*",
      });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.have.property("error");
  });

  // TODO: check admin full list vs. non-admin only see your own teams

  it('team/create,list,members/add,members/delete,delete', async () => {
    let teamName = "I'm a little teapot";
    let r;

    r = await api.post('/canvass/v1/team/create')
      .set('Authorization', 'Bearer '+admin.jwt)
      .send({
        name: teamName,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");
    expect(r.body.data).to.be.an('array');

    r = await api.post('/canvass/v1/team/create')
      .set('Authorization', 'Bearer '+admin.jwt)
      .send({
        name: teamName,
      });
    expect(r.statusCode).to.equal(500);
    expect(r.body.error).to.equal(true);
    expect(r.body.msg).to.be.an('string');

    r = await api.get('/canvass/v1/team/members/list?teamName='+teamName)
      .set('Authorization', 'Bearer '+admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

    r = await api.post('/canvass/v1/team/members/add')
      .set('Authorization', 'Bearer '+admin.jwt)
      .send({
        teamName: teamName,
        cId: bob.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post('/canvass/v1/team/members/add')
      .set('Authorization', 'Bearer '+admin.jwt)
      .send({
        teamName: teamName,
        cId: sally.id,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.get('/canvass/v1/team/members/list?teamName='+teamName)
      .set('Authorization', 'Bearer '+admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(2);

    r = await api.post('/canvass/v1/team/delete')
      .set('Authorization', 'Bearer '+admin.jwt)
      .send({
        name: teamName,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.not.have.property("error");

    r = await api.get('/canvass/v1/team/members/list?teamName='+teamName)
      .set('Authorization', 'Bearer '+admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data.length).to.equal(0);

  });

});

