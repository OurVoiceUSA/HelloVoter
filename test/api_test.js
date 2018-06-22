var should = require('chai').should(),
  expect = require('chai').expect,
  supertest = require('supertest'),
  api = supertest('http://localhost:8080');

var fs = require('fs');
var jwt_inval;
var jwt;

describe('User', function () {

  before(function (done) {

    jwt = fs.readFileSync('jwt').toString().trim();
    jwt_inval = fs.readFileSync('jwt_inval').toString().trim();
    done();

/*
    TODO: call and endpoint to get a valid and an invalid JWT token

    api.post('/auth/jwt')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'OurVoiceUSA/test')
      .send({
        apiKey: "12345678765432",
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        jwt_inval = res.body;
        done();
      });
*/
  });


  it('should return a 401 response', function (done) {
    api.get('/canvass/v1/hello')
      .expect(401)
      .expect(401, done);
  });

  it('should return a 403 response', function (done) {
    api.get('/canvass/v1/hello')
      .set('Authorization', 'Bearer '+jwt_inval)
      .expect(403, done);
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

