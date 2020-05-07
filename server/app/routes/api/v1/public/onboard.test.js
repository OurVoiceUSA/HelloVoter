
import { expect } from 'chai';

import { hv_config } from '../../../../lib/hv_config';
import neo4j from '../../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../../test/lib/utils';

var api;
var db;
var c, forms, turfs;

describe('Onboard', function () {

  before(async () => {
    db = new neo4j(hv_config);
    api = await appInit(db);
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
        longitude: -111.9020553,
        latitude: 40.7628194,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        latitude: 40.7628194,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: -111.9020553,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('bad input', async () => {
    let r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: -111.9020553,
        latitude: 40.7628194,
        badinput: "foobar",
      });
    expect(r.statusCode).to.equal(403);
    expect(r.body.error).to.equal(true);
  });

  it('invalid formId', async () => {
    let r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: -111.9020553,
        latitude: 40.7628194,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('valid formId valid turfs', async () => {
    let r = await api.put(base_uri+'/form/'+forms.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ public_onboard: true });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: -111.9020553,
        latitude: 40.7628194,
      });
    expect(r.statusCode).to.equal(200);
    expect(r.body.inviteCode).to.equal(forms.A.id+','+turfs.C.id);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: -122.4251828, // Alcatraz
        latitude: 37.8267028,
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
        longitude: -111.9020553,
        latitude: 40.7628194,
      });
    expect(r.statusCode).to.equal(403);
  });

  it('invalid formId after unset public_onboard', async () => {
    let r = await api.put(base_uri+'/form/'+forms.A.id)
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({ public_onboard: false });
    expect(r.statusCode).to.equal(200);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId: forms.A.id,
        longitude: -111.9020553,
        latitude: 40.7628194,
      });
    expect(r.statusCode).to.equal(403);
  });

});
