import { expect } from 'chai';

export function mockReact(ap) {
  try {
    a = new ap.default();
    // mock setState
    a.setState = (obj, callback) => {
      Object.keys(obj).forEach(o => {
        a.state[o] = obj[o];
      });
      if (callback) callback();
    };
  } catch (e) {
    console.log(e);
    expect(false).to.equal(true);
  }
  return a;
}
