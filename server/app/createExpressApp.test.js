import { expect } from 'chai';
import _ from 'lodash';

import { doExpressInit } from './createExpressApp';
import { hv_config } from './lib/hv_config';
import { appInit } from '../test/lib/utils';
import neo4j from './lib/neo4j';

var db;

describe('doExpressInit', function () {

  before(() => {
    db = new neo4j(hv_config);
  });

  after(async () => {
    db.close();
  });

  it('ip_header check', async () => {
    let api = await appInit(db, _.merge({}, hv_config, {DEBUG: false, ip_header: 'x-client-ip'}));
    let r = await api.get('/poke');
    expect(r.statusCode).to.equal(400);
    expect(r.body.msg).to.equal('Missing required header.');

    r = await api.get('/poke')
      .set('x-client-ip', '127.0.0.1')
    expect(r.statusCode).to.equal(200);
  });

  it('fetch public key', async () => {
    let api = await appInit(db, _.merge({}, hv_config, {jwt_pub_key: null}));
    let r = await api.get('/poke');
    expect(r.statusCode).to.equal(200);
  });

  it('fetch bad public key', async () => {
    let api = await doExpressInit({db, logger: (l,m,n) => {n()}, config: _.merge({}, hv_config, {jwt_pub_key: null, sm_oauth_url: 'http://localhost:9991'})});
    expect(api.error).to.equal(true);
  });

});
