import { expect } from 'chai';
import _ from 'lodash';

import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';
import { hv_config } from '../../../lib/hv_config';
import neo4j from '../../../lib/neo4j';

var api, gapi;
var db;
var c;

describe('Import', function () {

  before(async () => {
    db = new neo4j(hv_config);
    api = await appInit(db);
    gapi = await appInit(db, _.merge({}, hv_config, {enable_geocode: true}));
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

  it('get required-fields default', async () => {
    let r = await api.get(base_uri+'/import/required-fields')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.fields[0]).to.equal(1);
    expect(r.body.fields[1]).to.equal(6);
    expect(r.body.fields[2]).to.equal(7);
  });

  it('get required-fields geocoding', async () => {
    let r = await gapi.get(base_uri+'/import/required-fields')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.fields[0]).to.equal(1);
    expect(r.body.fields[1]).to.equal(3);
    expect(r.body.fields[2]).to.equal(5);
  });

  it('list as admin', async () => {
    let r = await api.get(base_uri+'/import')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.import.length).to.equal(0);
  });

  it('list non-admin', async () => {
    let r = await api.get(base_uri+'/import')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

});
