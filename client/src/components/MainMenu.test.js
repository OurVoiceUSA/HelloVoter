import { expect } from 'chai';

import { Platform } from '../lib/react-native';
import { MainMenu } from '.';

class MockRefer {
  setMenuClose = () => {}
  logout = () => {}
}

describe('App as ###OS###', function () {

  before(async () => {
    Platform.setOS('###OS###');
  });

  after(async () => {
  });

  it('MainMenu loads', async () => {
    let refer = new MockRefer();
    MainMenu({refer});
  });

});
