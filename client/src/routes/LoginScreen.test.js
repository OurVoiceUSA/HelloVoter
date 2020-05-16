import { expect } from 'chai';

import { Platform } from '../lib/react-native';
import * as Login from './LoginScreen';

class MockState {
  setState = () => {}
}

var login;

describe('App as ###OS###', function () {

  before(async () => {
    Platform.setOS('###OS###');
    let mock = new MockState();
    login = Login.login.bind(mock);
  });

  after(async () => {
  });

  it('login OK', async () => {
    let ret = await login('sm');
    expect(ret).to.equal(true);
    //    expect(window.location.href).to.equal('blah');
  });

});
