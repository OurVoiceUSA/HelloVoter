import { expect } from 'chai';

import { hv_config } from '../../../../lib/hv_config';
import neo4j from '../../../../lib/neo4j';
import { appInit, base_uri, getObjs } from '../../../../../test/lib/utils';

var api;
var db;
var mua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3'

describe('Invite', function () {

  before(async () => {
    db = new neo4j(hv_config);
    api = await appInit(db);
  });

  after(async () => {
    db.close();
  });

  it('invite URL desktop redirects to web', async () => {
    let r = await api.get(base_uri+'/public/invite');
    expect(r.statusCode).to.equal(302);
    expect(r.headers.location).to.equal('https://ourvoiceusa.org/hellovoter/');
  });

  it('invite URL mobile redirects to mobile', async () => {
    let r = await api.get(base_uri+'/public/invite')
      .set('User-Agent', mua);
    expect(r.statusCode).to.equal(302);
    expect(r.headers.location).to.equal('OurVoiceApp://invite?inviteCode=undefined&server=undefined');
  });

  it('invite URL mobile input/output test', async () => {
    let r = await api.get(base_uri+'/public/invite?inviteCode=asdf&server=hellovoter.example.com')
      .set('User-Agent', mua);
    expect(r.statusCode).to.equal(302);
    expect(r.headers.location).to.equal('OurVoiceApp://invite?inviteCode=asdf&server=hellovoter.example.com');

    r = await api.get(base_uri+'/public/invite?inviteCode=demoyay&orgId=DEMO')
      .set('User-Agent', mua);
    expect(r.statusCode).to.equal(302);
    expect(r.headers.location).to.equal('OurVoiceApp://invite?inviteCode=demoyay&orgId=DEMO');
  });

});
