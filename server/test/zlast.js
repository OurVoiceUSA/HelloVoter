
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { hv_config } from '../app/lib/hv_config';
import neo4j from '../app/lib/neo4j';
import { appInit, base_uri, getObjs, keep, tpx } from './lib/utils';

var api;
var db;
var c, turfs, forms;

describe('Cleanup', function () {

  before(async () => {
    db = new neo4j(hv_config);
    api = await appInit(db);
    c = getObjs('volunteers');
    turfs = getObjs('turfs');
    forms = getObjs('forms');
  });

  after(async () => {
    db.close();
  });

  (keep?it.skip:it)('delete turfs', async () => {
    let r;

    r = await api.delete(base_uri+'/turf/'+turfs.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);

    r = await api.delete(base_uri+'/turf/'+turfs.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);

    r = await api.delete(base_uri+'/turf/'+turfs.C.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
  });

  (keep?it.skip:it)('delete forms', async () => {
    let r;

    r = await api.delete(base_uri+'/form/'+forms.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);

    r = await api.delete(base_uri+'/form/'+forms.B.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
  });

  (keep?it.skip:it)('delete volunteers', async () => {
    await db.query('match (v:Volunteer) detach delete v');
  });

  (keep?it.skip:it)('chemistry test - confirming all test objects argon', async () => {
    let ref = await db.query('match (a) where a.name =~ "'+tpx+'.*" and NOT labels(a)[0] =~ "Deleted.*" return count(a)');
    expect(ref[0]).to.equal(0);
  });

  it('bob\'s your uncle', async () => {
    const r = await api.get(base_uri+'/uncle')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.name).to.equal("Bob");
  });

});
