import { expect } from 'chai';

import { STORAGE_KEY_JWT } from '../src/lib/consts';
import { Platform } from '../src/lib/react-native';
import * as storage from '../src/lib/storage';
import { mockReact } from '../test/lib/utils';
import * as App from '../src/App';

var a;
var jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxMjM0NTY3ODkiLCJuYW1lIjoiVGVzdCBVc2VyIn0.L0UY1nzBJR3eYVvh2LDppVM_gZD7A-Zy_iXsGxbRfgM';

window = {
  location: {href: ""},
  realod: () => {},
};

describe('App as ###OS###', function () {

  before(async () => {
    Platform.setOS('###OS###');
    await storage.set(STORAGE_KEY_JWT, jwt)
  });

  after(async () => {
  });

  it('App loads', async () => {
    a = mockReact(App);
    expect(a.state.loading).to.equal(true);
  });

  it('App componentDidMount', async () => {
    try {
      await a.componentDidMount();
    } catch (e) {
      console.log(e);
      expect(false).to.equal(true);
    }
    expect(a.state.loading).to.equal(false);
    expect(a.state.token).to.equal(jwt);
  });

  it('App setToken invalid jwt', async () => {
    try {
      await a.setToken('foo');
    } catch (e) {
      console.log(e);
      expect(false).to.equal(true);
    }
    expect(a.state.token).to.equal(null);
  });

});
