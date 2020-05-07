import { expect } from 'chai';
import http from 'http';
import fs from 'fs';
import _ from 'lodash';

import { appInit, base_uri, getObjs } from '../test/lib/utils';
import { doExpressInit } from './createExpressApp';
import { hv_config } from './lib/hv_config';
import neo4j from './lib/neo4j';

var db;
var c;
var logger = (l,m,n) => {n()};

describe('doExpressInit', function () {

  before(() => {
    db = new neo4j(hv_config);
    c = getObjs('volunteers');
  });

  after(async () => {
    db.close();
  });

  it('ip_header check', async () => {
    let api = await appInit(db, _.merge({}, hv_config, {ip_header: 'x-client-ip'}));
    let r = await api.get(base_uri);
    expect(r.statusCode).to.equal(400);
    expect(r.body.msg).to.equal('Missing required header.');

    r = await api.get(base_uri+'/poke')
      .set('x-client-ip', '127.0.0.1')
      .set('Authorization', 'Bearer foo')
    expect(r.statusCode).to.equal(401);
  });

  it('fetch bad public key', async () => {
    let api = await doExpressInit({db, logger, config: _.merge({}, hv_config, {jwt_pub_key: null, sm_oauth_url: 'http://localhost:9991'})});
    expect(api.error).to.equal(true);
  });

  it('fetch public key bad issuer', async () => {
    let server = http.createServer((req, res) => {
      res.setHeader('x-jwt-iss', 'example.com');
      res.write(fs.readFileSync(hv_config.jwt_pub_key));
      res.end();
    });
    server.listen(9992);

    let api = await doExpressInit({db, logger, config: _.merge({}, hv_config, {jwt_pub_key: null, sm_oauth_url: 'http://localhost:9992'})});
    expect(api.error).to.equal(true);

    server.close();
  });

  it('jwt has wrong issuer', async () => {
    let server = http.createServer((req, res) => {
      res.setHeader('x-jwt-iss', 'example.com');
      res.write(fs.readFileSync(hv_config.jwt_pub_key));
      res.end();
    });
    server.listen(9993);

    let api = await appInit(db, _.merge({}, hv_config, {jwt_iss: 'example.com', jwt_pub_key: null, sm_oauth_url: 'http://localhost:9993'}));
    let r = await api.get(base_uri+'/public/poke');
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/poke')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(401);
    expect(r.body.msg).to.equal('Your token was issued for a different domain.');

    server.close();
  });

  it('fetch good public key', async () => {
    let server = http.createServer((req, res) => {
      res.setHeader('x-jwt-iss', hv_config.jwt_iss);
      res.write(fs.readFileSync(hv_config.jwt_pub_key));
      res.end();
    });
    server.listen(9994);

    let api = await appInit(db, _.merge({}, hv_config, {jwt_pub_key: null, sm_oauth_url: 'http://localhost:9994'}));
    let r = await api.get(base_uri+'/public/poke');
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/poke')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(200);

    server.close();
  });

});
