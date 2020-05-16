import { expect } from 'chai';

import * as App from '../src/App';

var a;

describe('Test', function () {

  before(async () => {
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
  });

});
