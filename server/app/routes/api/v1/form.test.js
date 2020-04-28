import { expect } from 'chai';
import fs from 'fs';

import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';
import { ov_config } from '../../../lib/ov_config';
import neo4j from '../../../lib/neo4j';

var api;
var db;
var c, forms;

describe('Forms', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
    forms = getObjs('forms');
  });

  after(async () => {
    db.close();
  });

  // create

  it('create invalid characters', async () => {
    let r = await api.post(base_uri+'/form')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "*",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create as non-admin', async () => {
    let r = await api.post(base_uri+'/form')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({ name: "non-admin" });
    expect(r.statusCode).to.equal(403);
  });

  // get

  it('get as non-admin', async () => {
    let r = await api.get(base_uri+'/form/'+forms.A.id)
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

  it('get as admin', async () => {
    let r = await api.get(base_uri+'/form/'+forms.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal(forms.A.id);
  });

  // TODO: update

  // list

  it('list as non-admin', async () => {
    let r = await api.get(base_uri+'/forms')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.forms.length).to.equal(0);
  });

  it('list as admin', async () => {
    let r = await api.get(base_uri+'/forms')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.forms.length).to.equal(Object.keys(forms).length);
  });

  // TODO: list filter

  // delete

  it('delete as non-admin', async () => {
    const r = await api.delete(base_uri+'/form/'+forms.A.id)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
  });

});
