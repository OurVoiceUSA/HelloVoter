var should = require('chai').should(),
  expect = require('chai').expect,
  supertest = require('supertest'),
  api = supertest('http://localhost:8080');
  live = supertest('https://wsdev.ourvoiceusa.org');

var fs = require('fs');
var jwt;
var jwt_bad;
var jwt_inval;

describe('User', function () {

  before(function (done) {

    // TODO: call an endpoint to get these tokens
    jwt = fs.readFileSync('jwt').toString().trim();
    jwt_inval = fs.readFileSync('jwt_inval').toString().trim();

    live.post('/auth/jwt')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'OurVoiceUSA/test')
      .send({
        apiKey: "12345678765432",
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        jwt_bad = res.body.jwt;
        done();
      });

  });

  it('should return a 401 response', function (done) {
    api.get('/canvass/v1/hello')
      .expect(401)
      .end(function (err, res) {
        expect(res.body.error).to.equal(true);
        expect(res.body.msg).to.equal("Invalid token.");
        done();
      });
  });

  it('should return a 400 response', function (done) {
    api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_bad)
      .expect(400)
      .end(function (err, res) {
        expect(res.body.error).to.equal(true);
        expect(res.body.msg).to.equal("Your token is missing a required parameter.");
        done();
      });
  });

  it('should return a 403 response', function (done) {
    api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_inval)
      .expect(403)
      .end(function (err, res) {
        expect(res.body.error).to.equal(true);
        expect(res.body).to.have.property("msg");
        done();
      });
  });

  it('should return a hello payload, awaiting assignment', function (done) {
    api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt)
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

});

