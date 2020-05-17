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
  });

  after(async () => {
    a.logout();
  });

  it('App loads', async () => {
    a = mockReact(App);
    a.render();
    expect(a.state.loading).to.equal(true);
  });

  it('App componentDidMount', async () => {
    try {
      await a.componentDidMount();
      a.render();
    } catch (e) {
      console.log(e);
      expect(false).to.equal(true);
    }
    expect(a.state.loading).to.equal(false);
    expect(a.state.token).to.equal(null);
  });

  it('App componentDidMount load jwt from storage', async () => {
    try {
      await storage.set(STORAGE_KEY_JWT, jwt);
      a.setState({loading: true, user: null, token: null});
      await a.componentDidMount();
      a.render();
    } catch (e) {
      console.log(e);
      expect(false).to.equal(true);
    }
    expect(a.state.loading).to.equal(false);
    expect(a.state.token).to.equal(jwt);
  });

  it('App logout', async () => {
    await a.logout();
    expect(await storage.get(STORAGE_KEY_JWT)).to.equal(undefined);
    expect(a.state.user).to.equal(null);
    expect(a.state.token).to.equal(null);
  });

  it('App componentDidMount load jwt from URL', async () => {
    try {
      a.setState({loading: true, user: null, token: null});
      window.location.href = '/#/jwt/'+jwt;
      await a.componentDidMount();
      a.render();
    } catch (e) {
      console.log(e);
      expect(false).to.equal(true);
    }
    if (Platform.OS === 'web') {
      expect(a.state.token).to.equal(jwt);
      expect(await storage.get(STORAGE_KEY_JWT)).to.equal(jwt);
      expect(a.state.loading).to.equal(true);
      // TODO: assert the URL change & reload
    } else {
      // non-web doesn't have a URL - assert that loading still got set to false
      expect(a.state.loading).to.equal(false);
    }
  });

  it('App componentDidMount no jwt from URL', async () => {
    try {
      await a.logout();
      window.location.href = '/#/jwt/';
      await a.componentDidMount();
      a.render();
    } catch (e) {
      console.log(e);
      expect(false).to.equal(true);
    }
    if (Platform.OS === 'web') {
      expect(a.state.token).to.equal(null);
      expect(await storage.get(STORAGE_KEY_JWT)).to.equal(undefined);
      expect(a.state.loading).to.equal(true);
      // TODO: assert the URL change & reload
    } else {
      // non-web doesn't have a URL - assert that loading still got set to false
      expect(a.state.loading).to.equal(false);
    }
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

  it('App handleOpenURL invalid jwt', async () => {
    try {
      await a.handleOpenURL({url: 'OVApp://login?jwt=foo'});
    } catch (e) {
      console.log(e);
      expect(false).to.equal(true);
    }
    expect(a.state.token).to.equal(null);
    expect(await storage.get(STORAGE_KEY_JWT)).to.equal(undefined);
  });

  it('App handleOpenURL valid jwt', async () => {
    try {
      await a.handleOpenURL({url: 'OVApp://login?jwt='+jwt});
    } catch (e) {
      console.log(e);
      expect(false).to.equal(true);
    }
    expect(await storage.get(STORAGE_KEY_JWT)).to.equal(jwt);
    expect(a.state.token).to.equal(jwt);
    expect(a.state.user.name).to.equal("Test User");
  });

  it('App setMenuOpen opens menu', async () => {
    a.setMenuOpen();
    expect(a.state.menuOpen).to.equal(true);
  });

  it('App setMenuClose closes menu', async () => {
    a.setMenuClose();
    expect(a.state.menuOpen).to.equal(false);
  });

});

