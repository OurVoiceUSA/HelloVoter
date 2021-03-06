
import { expect } from 'chai';

import { ov_config } from '../../../lib/ov_config';
import neo4j from '../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';

var api;
var db;
var c;

describe('Import', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
  });

  after(async () => {
    db.close();
  });

  it('get required-fields permission denied', async () => {
    let r = await api.get(base_uri+'/import/required-fields')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

  it('get required-fields', async () => {
    let r = await api.get(base_uri+'/import/required-fields')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body[0]).to.equal(1);
    expect(r.body[1]).to.equal(6);
    expect(r.body[2]).to.equal(7);
  });

  it('list permission denied', async () => {
    let r = await api.get(base_uri+'/import/list')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

});
