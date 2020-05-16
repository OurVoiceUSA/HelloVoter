import { expect } from 'chai';

import { STORAGE_KEY_JWT } from '../src/lib/consts';
import * as storage from '../src/lib/storage'
import * as App from '../src/App';

var a;
var jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxMjM0NTY3ODkiLCJuYW1lIjoiVGVzdCBVc2VyIn0.L0UY1nzBJR3eYVvh2LDppVM_gZD7A-Zy_iXsGxbRfgM';

describe('Test', function () {

  before(async () => {
    await storage.set(STORAGE_KEY_JWT, jwt)
  });

  after(async () => {
  });

  it('App loads', async () => {
    try {
      a = new App.default();
      // mock setState
      a.setState = (obj, callback) => {
        Object.keys(obj).forEach(o => {
          a.state[o] = obj[o];
        });
        if (callback) callback();
      };
    } catch (e) {
      expect(false).to.equal(true);
    }
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

  it('App setToken parses jwt', async () => {
    try {
      await a.setToken('foo');
      expect(false).to.equal(true);
    } catch (e) {
      expect(true).to.equal(true);
    }
  });

});
