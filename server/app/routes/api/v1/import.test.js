import { expect } from 'chai';

import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';
import { hv_config } from '../../../lib/hv_config';
import neo4j from '../../../lib/neo4j';

var api;
var db;
var c;

describe('Import', function () {

  before(() => {
    db = new neo4j(hv_config);
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
    expect(r.body.fields[0]).to.equal(1);
    expect(r.body.fields[1]).to.equal(6);
    expect(r.body.fields[2]).to.equal(7);
  });

  it('list permission denied', async () => {
    let r = await api.get(base_uri+'/import')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

});
