
import { expect } from 'chai';

import { ov_config } from '../../../../lib/ov_config';
import neo4j from '../../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../../test/lib/utils';

var api;
var db;
var c, forms, turfs;

describe('Onboard', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
    forms = getObjs('forms');
    turfs = getObjs('turfs');
  });

  after(async () => {
    db.close();
  });

  it('missing input', async () => {
    let r = await api.post(base_uri+'/public/onboard')
      .send({
        longitude: 1.1,
        latitude: 1.1,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        latitude: 1.1,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: 1.1,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('bad input', async () => {
    let r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: 1.1,
        latitude: 1.1,
        badinput: "foobar",
      });
    expect(r.statusCode).to.equal(403);
    expect(r.body.error).to.equal(true);
  });

  it('invalid formId', async () => {
    let r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: 1.1,
        latitude: 1.1,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('valid formId valid turf', async () => {
    let r = await api.post(base_uri+'/form/update')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: forms.A.id,
        public_onboard: true,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.inviteCode).to.equal(forms.A.id+','+turfs.A.id);
  });

  it('valid formId invalid turf', async () => {
    let r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: 1.1,
        latitude: 1.1,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('invalid formId when another one is valid', async () => {
    let r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.B.id,
        longitude: -118.3281370,
        latitude: 33.9208231,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('invalid formId after unset public_onboard', async () => {
    let r = await api.post(base_uri+'/form/update')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: forms.A.id,
        public_onboard: false,
      });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: 1.1,
        latitude: 1.1,
      });
    expect(r.statusCode).to.equal(403);
  });

});
