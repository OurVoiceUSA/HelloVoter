import { expect } from 'chai';

import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';
import { hv_config } from '../../../lib/hv_config';
import { ID_PARTY } from '../../../lib/consts';
import neo4j from '../../../lib/neo4j';

var api;
var db;
var c, turfs;

describe('Analytics', function () {

  before(() => {
    db = new neo4j(hv_config);
    api = appInit(db);
    c = getObjs('volunteers');
    turfs = getObjs('turfs');
  });

  after(async () => {
    db.close();
  });

  // list

  it('list invalid parameter', async () => {
    let r = await api.get(base_uri+'/analytics')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);
  });

  it('list as non-admin', async () => {
    let r = await api.get(base_uri+'/analytics?aId='+ID_PARTY)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

  it('list without turf', async () => {
    let r = await api.get(base_uri+'/analytics?aId='+ID_PARTY)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.analytics.length).to.equal(0);
  });

  it('list with turf', async () => {
    let r = await api.get(base_uri+'/analytics?aId='+ID_PARTY+'&turfId='+turfs.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.analytics.length).to.equal(0);
  });

  it('list without turf include_null', async () => {
    let r = await api.get(base_uri+'/analytics?aId='+ID_PARTY+'&include_null=true')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.analytics.length).to.equal(0);
  });

  it('list with turf include_null', async () => {
    let r = await api.get(base_uri+'/analytics?aId='+ID_PARTY+'&turfId='+turfs.A.id+'&include_null=true')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.analytics.length).to.equal(0);
  });

});
