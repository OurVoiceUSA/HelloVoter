
import { expect } from 'chai';

import { ov_config } from '../../../../lib/ov_config';
import neo4j from '../../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../../test/lib/utils';

var api;
var db;
var formId = "4a320f76-ef7b-4d73-ae2a-8f4ccf5de344";

describe('Onboard', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
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
        formId,
        latitude: 1.1,
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/public/onboard')
      .send({
        formId,
        longitude: 1.1,
      });
    expect(r.statusCode).to.equal(400);
  });

  it('bad input', async () => {
    let r = await api.post(base_uri+'/public/onboard')
      .send({
        formId,
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
        formId,
        longitude: 1.1,
        latitude: 1.1,
      });
    expect(r.statusCode).to.equal(403);
  });

});
