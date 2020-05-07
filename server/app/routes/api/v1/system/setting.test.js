import { expect } from 'chai';

import { appInit, base_uri, getObjs } from '../../../../../test/lib/utils';
import { hv_config } from '../../../../lib/hv_config';
import { version } from '../../../../../package.json';
import neo4j from '../../../../lib/neo4j';

var api;
var db;
var c, turfs, forms;

describe('System', function () {

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

  it('info as admin', async () => {
    const r = await api.get(base_uri+'/system/info')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.admins).to.equal(1);
    expect(r.body.volunteers).to.equal(Object.keys(c).length);
    expect(r.body.turfs).to.equal(Object.keys(turfs).length);
    expect(r.body.forms).to.equal(Object.keys(forms).length);
    expect(r.body.attributes).to.equal(18);
    expect(r.body.addresses).to.equal(1);
    expect(r.body.dbversion).to.equal(await db.version());
    expect(r.body.apiversion).to.equal(version);
  });

  it('info as non-admin', async () => {
    const r = await api.get(base_uri+'/system/info')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      expect(r.statusCode).to.equal(403);
      expect(r.body).to.not.have.property('version');
  });

  // get

  it('404 invalid setting', async () => {
    let r = await api.get(base_uri+'/system/setting/foobar')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(404);
  });

  it('get valid setting', async () => {
    let r = await api.get(base_uri+'/system/setting/debug')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal('debug');
    expect(r.body.value).to.equal(false);
  });

  it('try to get setting as non-admin', async () => {
    let r = await api.get(base_uri+'/system/setting/debug')
      .set('Authorization', 'Bearer '+c.bob.jwt);
    expect(r.statusCode).to.equal(403);
  });

  // update

  it('update setting', async () => {
    let r = await api.put(base_uri+'/system/setting/debug')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ value: true })
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/system/setting/debug')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal('debug');
    expect(r.body.value).to.equal(true);

    // poke while in debug for code branch coverage
    r = await api.get(base_uri+'/public/poke')
    expect(r.statusCode).to.equal(200);

    r = await api.put(base_uri+'/system/setting/debug')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ value: false })
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/system/setting/debug')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal('debug');
    expect(r.body.value).to.equal(false);
  });

  it('try update setting as non-admin', async () => {
    let r = await api.put(base_uri+'/system/setting/debug')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({ value: true })
    expect(r.statusCode).to.equal(403);

    r = await api.get(base_uri+'/system/setting/debug')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.id).to.equal('debug');
    expect(r.body.value).to.equal(false);
  });

  // list

  it('list settings', async () => {
    let r = await api.get(base_uri+'/system/settings')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(r.body.settings.length);
  });

});
