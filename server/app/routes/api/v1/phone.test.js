
import { expect } from 'chai';

import { ov_config } from '../../../lib/ov_config';
import neo4j from '../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../test/lib/utils';

var api;
var db;
var c, forms;

describe('Volunteer', function () {

  before(() => {
    db = new neo4j(ov_config);
    api = appInit(db);
    c = getObjs('volunteers');
    forms = getObjs('forms');
  });

  after(async () => {
    await db.query('match (cq:CallerQueue) detach delete cq');
    db.close();
  });

  it('tocall no formId', async () => {
    const r = await api.post(base_uri+'/poc/phone/tocall')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(400);
  });

  it('tocall try to filter_id', async () => {
    const r = await api.post(base_uri+'/poc/phone/tocall')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        filter_id: 'asdf',
      });
    expect(r.statusCode).to.equal(400);
  });

  it('tocall unassigned formId', async () => {
    const r = await api.post(base_uri+'/poc/phone/tocall')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        formId: forms.A.id,
      });
    expect(r.statusCode).to.equal(403);
  });

/* TODO: need to assign first
  it('tocall returns no data', async () => {
    const r = await api.post(base_uri+'/poc/phone/tocall')
      .set('Authorization', 'Bearer '+c.admin.jwt);
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.be.an('object');
    expect(Object.keys(r.body)).to.equal(0);
  });
*/

});
