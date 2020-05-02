import { expect } from 'chai';
import _ from 'lodash';

import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';
import { hv_config } from '../../../lib/hv_config';
import neo4j from '../../../lib/neo4j';

var api;
var db;
var c;
var person;

describe('Persons', function () {

  before(async () => {
    db = new neo4j(hv_config);
    api = await appInit(db);
    c = getObjs('volunteers');
  });

  after(async () => {
    db.close();
  });

  // create

  it('create missing parameters', async () => {
    let r = await api.post(base_uri+'/person')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: "string",
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/person')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        personId: "string",
        formId: "string",
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/person')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        personId: "string",
        formId: "string",
        deviceId: "string",
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/person')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        personId: "string",
        formId: "string",
        deviceId: "string",
        addressId: "string",
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/person')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        personId: "string",
        formId: "string",
        deviceId: "string",
        addressId: "string",
        longitude: 1,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/person')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        personId: "string",
        formId: "string",
        deviceId: "string",
        addressId: "string",
        longitude: 1,
        latitude: 1,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/person')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        personId: "string",
        formId: "string",
        deviceId: "string",
        addressId: "string",
        longitude: 1,
        latitude: 1,
        status: 1,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/person')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        personId: "string",
        formId: "string",
        deviceId: "string",
        addressId: "string",
        longitude: 1,
        latitude: 1,
        status: 1,
        start: 1,
      });
    expect(r.statusCode).to.equal(400);

  });

  // TODO: successful create

  // get

  // TODO: admin can see a person

  // TODO: non-admin can't see person outside their turf

  // TODO: non-admin can see someone inside thier turf

  // update

  // TODO: admin can update a person

  // TODO: non-admin can't update person outside their turf

  // TODO: non-admin can update someone inside thier turf

  // delete

  // TODO: non-admin can't delete a person

/*   TODO: admin can delete a person
  it('delete person', async () => {
    let r = await api.delete(base_uri+'/person/'+at.personId)
      .set('Authorization', 'Bearer '+c.admin.jwt)
    expect(r.statusCode).to.equal(200);
    expect(r.body.deleted).to.equal(true);

    r = await api.get(base_uri+'/person/'+at.personId)
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(404);
  });

  // list

  it('list persons', async () => {
    let r = await api.get(base_uri+'/persons')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(r.body.attributes.length);
    let count = r.body.count;

    r = await api.get(base_uri+'/attributes?start=1')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(count-1);
  });

  it('list persons with filter', async () => {
    let r = await api.get(base_uri+'/persons?filters=')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body.count).to.equal(3);
  });
*/

});
