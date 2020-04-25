import { expect } from 'chai';

import { ov_config } from '../../../../lib/ov_config';
import neo4j from '../../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../../test/lib/utils';

var api;
var db;

describe('Invite', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
  });

  after(async () => {
    db.close();
  });

  it('deprecated invite URL desktop redirects to web', async () => {
    let r = await api.get('/HelloVoterHQ/mobile/invite');
    expect(r.statusCode).to.equal(302);
  });

  it('deprecated invite URL desktop redirects to web with orgId', async () => {
    let r = await api.get('/HelloVoterHQ/DEMO/mobile/invite');
    expect(r.statusCode).to.equal(302);
  });

  it('invite URL desktop redirects to web', async () => {
    let r = await api.get(base_uri+'/public/invite');
    expect(r.statusCode).to.equal(302);
  });

  it('invite URL desktop redirects to web with orgId', async () => {
    let r = await api.get(base_uri+'/public/invite');
    expect(r.statusCode).to.equal(302);
  });

});
