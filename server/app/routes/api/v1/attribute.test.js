import { expect } from 'chai';
import _ from 'lodash';

import { appInit, base_uri, getObjs, isuuid } from '../../../../test/lib/utils';
import { ID_NAME, ID_REG_VOTER } from '../../../lib/consts';
import { hv_config } from '../../../lib/hv_config';
import neo4j from '../../../lib/neo4j';

var api;
var db;
var c, forms;
var at;

describe('Attributes', function () {

  before(async () => {
    db = new neo4j(hv_config);
    api = await appInit(db);
    c = getObjs('volunteers');
    forms = getObjs('forms');
  });

  after(async () => {
    db.close();
  });

  // create

  it('create invalid parameter', async () => {
    let r;

    r = await api.post(base_uri+'/attribute')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "inval",
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/attribute')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        type: "string",
      });
    expect(r.statusCode).to.equal(400);
  });

  it('create invalid type', async () => {
    let r = await api.post(base_uri+'/attribute')
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

    r = await api.post(base_uri+'/attribute')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    expect(isuuid(r.body.attributeId)).to.equal(true);
    at = _.cloneDeep(r.body);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/'+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.type).to.equal(type);
  });

  it('create textbox', async () => {
    let type = "textbox";
    let r;

    r = await api.post(base_uri+'/attribute')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    expect(isuuid(r.body.attributeId)).to.equal(true);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/'+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.type).to.equal(type);
  });

  it('create number', async () => {
    let type = "number";
    let r;

    r = await api.post(base_uri+'/attribute')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    expect(isuuid(r.body.attributeId)).to.equal(true);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/'+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.type).to.equal(type);
  });

  it('create boolean', async () => {
    let type = "boolean";
    let r;

    r = await api.post(base_uri+'/attribute')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    expect(isuuid(r.body.attributeId)).to.equal(true);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/'+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.type).to.equal(type);
  });

  it('create date', async () => {
    let type = "date";
    let r;

    r = await api.post(base_uri+'/attribute')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    expect(isuuid(r.body.attributeId)).to.equal(true);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/'+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.type).to.equal(type);
  });

  it('create SAND', async () => {
    let type = "SAND";
    let r;

    r = await api.post(base_uri+'/attribute')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: type,
        type: type,
      });
    expect(r.statusCode).to.equal(200);
    expect(isuuid(r.body.attributeId)).to.equal(true);
    let id = r.body.attributeId;

    r = await api.get(base_uri+'/attribute/'+id)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.type).to.equal('string');
  });

  // get

  it('404 invalid attribute', async () => {
    let r = await api.get(base_uri+'/attribute/foobar')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(404);
  });

  it('get string attribute', async () => {
    let r = await api.get(base_uri+'/attribute/'+ID_NAME)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.name).to.equal('Name');
    expect(r.body.type).to.equal('string');
  });

  it('get boolean attribute', async () => {
    let r = await api.get(base_uri+'/attribute/'+ID_REG_VOTER)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.name).to.equal('Registered to Vote');
    expect(r.body.type).to.equal('boolean');
  });

  // update

  it('update attribute name', async () => {
    let r = await api.put(base_uri+'/attribute/'+at.attributeId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "foobar"
      })
    expect(r.statusCode).to.equal(200);
    expect(r.body.updated).to.equal(true);

    r = await api.get(base_uri+'/attribute/'+at.attributeId)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.name).to.equal('foobar');
  });

  // delete

  it('delete attribute', async () => {
    let r = await api.delete(base_uri+'/attribute/'+at.attributeId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.deleted).to.equal(true);

    r = await api.get(base_uri+'/attribute/'+at.attributeId)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(404);
  });

  // list

  it('list attributes', async () => {
    let r = await api.get(base_uri+'/attributes')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(r.body.attributes.length);
    let count = r.body.count;

    r = await api.get(base_uri+'/attributes?start=1')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(count-1);
  });

  it('list attributes with filter', async () => {
    let r = await api.get(base_uri+'/attributes?filter=No')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(3);

    r = await api.get(base_uri+'/attributes?filter=P')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(2);
  });

  it('list attributes with limit', async () => {
    let r = await api.get(base_uri+'/attributes?limit=2')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(r.body.attributes.length);
    expect(r.body.count).to.equal(2);
    let alt = r.body.attributes[1].id;

    r = await api.get(base_uri+'/attributes?start=1&limit=2')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.attributes[0].id).to.equal(alt);
    expect(r.body.count).to.equal(2);
  });

});
