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

    r = await api.post(base_uri+'/address')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        name: "inval",
      });
    expect(r.statusCode).to.equal(400);

    r = await api.post(base_uri+'/address')
      .set('Authorization', 'Bearer '+c.admin.jwt)
      .send({
        type: "string",
      });
    expect(r.statusCode).to.equal(400);
  });

});
