
import { expect } from 'chai';

import { ov_config } from '../../../lib/ov_config';
import neo4j from '../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';

var api;
var db;
var c, turfs;

describe('Queue', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
    turfs = getObjs('turfs');
  });

  after(async () => {
    db.close();
  });

  // list

  it('list as non-admin', async () => {
    let r = await api.get(base_uri+'/queue/list')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

  it('list as admin', async () => {
    let r = await api.get(base_uri+'/queue/list')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    if (ov_config.disable_apoc === false)
      expect(r.body.data.length).to.equal(Object.keys(turfs).length);
  });

  // TODO: orphaned queue, as deleted turfs leave a hanging queue object

});
