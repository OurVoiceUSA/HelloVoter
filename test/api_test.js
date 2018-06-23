
var neo4j = require('neo4j-driver').v1;
var BoltAdapter = require('node-neo4j-bolt-adapter');

var should = require('chai').should(),
  expect = require('chai').expect,
  supertest = require('supertest'),
  api = supertest('http://localhost:8080');
  liveprd = supertest(process.env.BASE_URI_PROD);
  livedev = supertest(process.env.BASE_URI_DEV);

var fs = require('fs');
var jwt_admin;
var jwt_bob;
var jwt_bad;
var jwt_inval;

var authToken;
var db;

let teamName = "I'm a little tea-pot";

describe('API smoke', function () {

  before(function (done) {

    // clean up test data before we begin
    authToken = neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASS);
    db = new BoltAdapter(neo4j.driver('bolt://'+process.env.NEO4J_HOST, authToken));
    db.cypherQueryAsync('match (a) detach delete a');

    liveprd.post('/auth/jwt')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'OurVoiceUSA/test')
      .send({
        apiKey: "12345678765432",
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        jwt_inval = res.body.jwt;
      });

    livedev.post('/auth/jwt')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'OurVoiceUSA/test')
      .send({
        apiKey: "12345678765432",
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        jwt_bad = res.body.jwt;
      });

    livedev.get('/auth/tokentest')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        jwt_admin = res.body.jwt;
      });

    livedev.get('/auth/tokentest')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        jwt_bob = res.body.jwt;
        done();
      });

  });

  after(function (done) {
    db.close();
    done();
  });

  it('poke 200 timestamp', function (done) {
    api.get('/poke')
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body.data).to.be.an('array');
        expect(res.body.data[0]).to.satisfy(Number.isInteger);
        done();
      });
  });

  it('hello 400 no jwt', function (done) {
    api.get('/canvass/v1/hello')
      .expect(401)
      .end(function (err, res) {
        expect(res.body.error).to.equal(true);
        expect(res.body.msg).to.equal("Missing required header.");
        done();
      });
  });

  it('hello 400 bad jwt', function (done) {
    api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_bad)
      .expect(400)
      .end(function (err, res) {
        expect(res.body.error).to.equal(true);
        expect(res.body.msg).to.equal("Your token is missing a required parameter.");
        done();
      });
  });

  it('hello 403 invalid jwt', function (done) {
    api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_inval)
      .expect(403)
      .end(function (err, res) {
        expect(res.body.error).to.equal(true);
        expect(res.body).to.have.property("msg");
        done();
      });
  });

  it('hello 200 admin awaiting assignment', function (done) {
    api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_admin)
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body).to.have.property("msg");
        expect(res.body.msg).to.equal("Awaiting assignment");
        expect(res.body.data).to.have.property("ready");
        expect(res.body.data.ready).to.equal(false);
        done();
      });
  });

  it('hello 200 bob awaiting assignment', function (done) {
    api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_bob)
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body).to.have.property("msg");
        expect(res.body.msg).to.equal("Awaiting assignment");
        expect(res.body.data).to.have.property("ready");
        expect(res.body.data.ready).to.equal(false);
        done();
      });
  });

  // TODO: check admin full list vs. non-admin only see your own team

  it('canvasser/list 200 array', function (done) {
    api.get('/canvass/v1/canvasser/list')
      .set('Authorization', 'Bearer '+jwt_admin)
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body.data).to.be.an('array');
        done();
      });
  });

  // TODO: lock a user from above, make sure that user gets a 403, unlock it, then 200

  it('canvasser/lock 200 array', function (done) {
    api.post('/canvass/v1/canvasser/lock')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        id: "12345678765432",
      })
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body.data).to.be.an('array');
        done();
      });
  });

  it('canvasser/unlock 200 array', function (done) {
    api.post('/canvass/v1/canvasser/unlock')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        id: "12345678765432",
      })
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body.data).to.be.an('array');
        done();
      });
  });

  // TODO: check admin full list vs. non-admin only see your own teams

  it('team/list 200 array', function (done) {
    api.get('/canvass/v1/team/list')
      .set('Authorization', 'Bearer '+jwt_admin)
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body.data).to.be.an('array');
        done();
      });
  });

  it('team/create 400 invalid characters', function (done) {
    api.post('/canvass/v1/team/create')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        name: "_",
      })
      .expect(400)
      .end(function (err, res) {
        expect(res.body).to.have.property("error");
        done();
      });
  });

  // TODO: list to check that it's there, and again to see it missing

  it('team/create team/delete', function (done) {

    api.post('/canvass/v1/team/create')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        name: teamName,
      })
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body.data).to.be.an('array');
      });

    api.post('/canvass/v1/team/create')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        name: teamName,
      })
      .expect(500)
      .end(function (err, res) {
        expect(res.body.error).to.equal(true);
        expect(res.body.msg).to.be.an('string');
      });

    api.post('/canvass/v1/team/delete')
      .set('Authorization', 'Bearer '+jwt_admin)
      .send({
        name: teamName,
      })
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body.data).to.be.an('array');
        done();
      });

  });

  // TODO: check admin full list vs. non-admin only see your own teams

  it('team/member/list 200 array', function (done) {
    api.get('/canvass/v1/team/members/list?teamName='+teamName)
      .set('Authorization', 'Bearer '+jwt_admin)
      .expect(200)
      .end(function (err, res) {
        expect(res.body).to.not.have.property("error");
        expect(res.body.data).to.be.an('array');
        done();
      });
  });

});

