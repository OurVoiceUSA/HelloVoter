import { expect } from 'chai';
import _ from 'lodash';

import { appInit, base_uri, getObjs, isuuid } from '../../../../test/lib/utils';
import { hv_config } from '../../../lib/hv_config';
import { ID_NAME } from '../../../lib/consts';
import neo4j from '../../../lib/neo4j';

var api, gapi;
var db;
var c;
var importId;
var importData = [["123","1 Rocket Rd","","Hawthorn","CA","90250",-118.3281370,33.9208231,"Elon Musk"]];

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
    expect(r.body.count).to.equal(3);
    expect(r.body.fields.length).to.equal(r.body.count);
    expect(r.body.fields[0]).to.equal(1);
    expect(r.body.fields[1]).to.equal(6);
    expect(r.body.fields[2]).to.equal(7);
  });

  it('get required-fields geocoding', async () => {
    let r = await gapi.get(base_uri+'/import/required-fields')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(3);
    expect(r.body.fields.length).to.equal(r.body.count);
    expect(r.body.fields[0]).to.equal(1);
    expect(r.body.fields[1]).to.equal(3);
    expect(r.body.fields[2]).to.equal(5);
  });

  it('import invalid params', async () => {
    let r = await api.post(base_uri+'/import')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/import')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ filename: "test.csv" })
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/import')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ filename: "test.csv", attributes: "name,rank,serial number" })
    expect(r.statusCode).to.equal(400);
  });

  it('start an import non-admin', async () => {
    let r = await api.post(base_uri+'/import')
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({ filename: "test.csv", attributes: [ID_NAME] })
    expect(r.statusCode).to.equal(403);
  });

  it('start an import', async () => {
    let r = await api.post(base_uri+'/import')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ filename: "test.csv", attributes: [ID_NAME] })
    expect(r.statusCode).to.equal(200);
    importId = r.body.importId;
    expect(isuuid(importId)).to.equal(true);
  });

  it('post invalid data to an import', async () => {
    let r = await api.post(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ data: "name,rank,serial number" })
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ data: [] })
    expect(r.statusCode).to.equal(400);
  });

  it('post data to missing import', async () => {
    let r = await api.post(base_uri+'/import/foobar')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ data: importData })
    expect(r.statusCode).to.equal(404);
  });

  it('post data to import as non-admin', async () => {
    let r = await api.post(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.bob.jwt)
      .send({ data: importData })
    expect(r.statusCode).to.equal(403);
  });

  it('post data to an import', async () => {
    let r = await api.post(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ data: importData })
    expect(r.statusCode).to.equal(200);
  });

  it('finish an import non-admin', async () => {
    let r = await api.put(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
  });

  it('finish an import', async () => {
    let r = await api.put(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
  });

  it('finish an already finished import', async () => {
    let r = await api.put(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(403);
  });

// post to an already finished import

  it('get import details', async () => {
    let r = await api.get(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.filename).to.equal("test.csv");
  });

  it('get missing import', async () => {
    let r = await api.get(base_uri+'/import/foobar')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(404);
  });

  it('get import as non-admin', async () => {
    let r = await api.get(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
  });

  it('list as admin', async () => {
    let r = await api.get(base_uri+'/imports')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.import.length).to.equal(1);
  });

  it('list non-admin', async () => {
    let r = await api.get(base_uri+'/imports')
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);
  });

  it('delete import as non-admin', async () => {
    let r = await api.delete(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.bob.jwt)
    expect(r.statusCode).to.equal(403);

    r = await api.get(base_uri+'/imports')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.import.length).to.equal(1);
  });

  it('delete import', async () => {
    let r = await api.delete(base_uri+'/import/'+importId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);

    r = await api.get(base_uri+'/imports')
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.import.length).to.equal(0);
  });

});
