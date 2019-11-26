
import { expect } from 'chai';

import { ov_config } from '../../../lib/ov_config';
import neo4j from '../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';

var api;
var db;
var c, forms;

describe('Attributes', function () {

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

  it('create invalid parameter', async () => {
    let r;

    r = await api.post(base_uri+'/attribute/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "inval",
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/attribute/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        type: "string",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create invalid type', async () => {
    let r = await api.post(base_uri+'/attribute/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "inval",
        type: "invalid",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create string', async () => {
    let type = "string";
    let r;

    r = await api.post(base_uri+'/attribute/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/get?id='+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data[0].type).to.equal(type);
  });

  it('create textbox', async () => {
    let type = "textbox";
    let r;

    r = await api.post(base_uri+'/attribute/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/get?id='+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data[0].type).to.equal(type);
  });

  it('create number', async () => {
    let type = "number";
    let r;

    r = await api.post(base_uri+'/attribute/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/get?id='+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data[0].type).to.equal(type);
  });

  it('create boolean', async () => {
    let type = "boolean";
    let r;

    r = await api.post(base_uri+'/attribute/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/get?id='+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data[0].type).to.equal(type);
  });

  it('create date', async () => {
    let type = "date";
    let r;

    r = await api.post(base_uri+'/attribute/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/get?id='+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data[0].type).to.equal(type);
  });

  it('create SAND', async () => {
    let type = "SAND";
    let r;

    r = await api.post(base_uri+'/attribute/create')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/get?id='+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.data[0].type).to.equal('string');
  });

  // get

/*
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
    expect(r.body.data.length).to.equal(2);
  });
*/

  // form/list

  // form/add

  // form/remove

  // delete

/*
  case 'string':
  case 'textbox':
  case 'number':
  case 'boolean':
  case 'date':
  case 'SAND':
*/

});
