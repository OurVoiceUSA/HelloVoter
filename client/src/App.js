import React, { Component } from 'react';
import { Linking, Platform, TouchableOpacity, SideMenu } from './lib/react-native';
import jwt_decode from 'jwt-decode';

import { STORAGE_KEY_JWT, STORAGE_KEY_ORGIDS } from './lib/consts';
import { Router, Switch, Route } from './lib/routing';
import { Root, Content } from './components/Layout';
import { MainMenu } from './components/MainMenu';
import { SafariView } from './lib/SafariView';
import Loading from './components/Loading';
import * as storage from './lib/storage';
import * as Icon from './lib/icons';
import * as Routes from './routes';

class App extends Component {

  constructor() {
    super();

    this.state = {
      loading: true,
      token: null,
      user: null,
      orgId: null,
      orgIds: [],
      menuOpen: false,
    };

    // warn non-devs about the danger of the console
    if (process.env.NODE_ENV !== 'development')
      console.log(
        '%cWARNING: This is a developer console! If you were told to open this and copy/paste something, and you are not a javascript developer, it is a scam and entering info here could give them access to your account!',
        'background: red; color: yellow; font-size: 45px'
      );
  }

  componentDidMount = async () => {
    let token, orgId, orgIds;

    if (Platform.OS === 'web') {
      if (window.location.href.match(/\/jwt\//)) {
        token = window.location.href.split('/').pop();
        if (token) await this.setToken(token);
        setTimeout(() => {window.location.href = '/hellovoter/#/'}, 500);
        setTimeout(() => {window.location.reload()}, 1500);
        return;
      }
    } else {
      // Add event listener to handle OAuthLogin:// URLs
      Linking.addEventListener('url', this.handleOpenURL);
      // Launched from an external URL
      Linking.getInitialURL().then((url) => {
        if (url) this.handleOpenURL({ url });
      });
    }

    token = await storage.get(STORAGE_KEY_JWT);
    if (token) await this.setToken(token);

    try {
      orgIds = JSON.parse(await storage.get(STORAGE_KEY_ORGIDS));
      if (orgIds.length === 1) orgId = orgIds[0];
    } catch (e) {
      await storage.del(STORAGE_KEY_ORGIDS);
      orgIds = [];
    }

    this.setState({loading: false, orgId, orgIds});
  }

  fetch = async (url, args) => {
    const { token } = this.state;

    if (!args) args = {};
    if (!args.headers) args.headers = {
        'Authorization': 'Bearer '+token,
        'Content-Type': 'application/json',
      };

    return fetch(url, args);
  }

  logout = async () => {
    await storage.del(STORAGE_KEY_JWT);
    await storage.del(STORAGE_KEY_ORGIDS);
    this.setState({user: null, orgId: null, orgIds: [], token: null, menuOpen: false});
  }

  setToken = async (token) => {
    try {
      let user = jwt_decode(token);
      await storage.set(STORAGE_KEY_JWT, token);
      this.setState({token, user});
    } catch (e) {
      this.setState({token: null, user: null});
      await storage.del(STORAGE_KEY_JWT);
    }
  }

  setOrg = async (orgId) => {
    let orgIds;
    try {
      orgIds = JSON.parse(await storage.get(STORAGE_KEY_ORGIDS));
      if(!orgIds) orgIds = [orgId];
      else if (orgIds.indexOf(orgId) !== -1) orgIds.push(orgId);
    } catch (e) {
      await storage.del(STORAGE_KEY_ORGIDS);
    }

    try {
      await storage.set(STORAGE_KEY_ORGIDS, JSON.stringify(orgIds));
    } catch (e) {}

    this.setState({orgId, orgIds});
  }

  handleOpenURL = async ({ url }) => {
    // Extract jwt token out of the URL
    const m = url.match(/jwt=([^#]+)/);

    if (m) await this.setToken(m[1]);

    SafariView.dismiss();

    this.setState({loading: false});
  }

  setMenuOpen = () => {
    this.setState({menuOpen: true})
  }

  setMenuClose = () => {
    this.setState({menuOpen: false})
  }

  render() {
    const { loading, menuOpen, user, orgId } = this.state;

    const menu = (<MainMenu refer={this} />);

    if (loading) return (<Loading />);
    if (!user) return (<Router><Route path="/" render={() => <Routes.LoginScreen refer={this} />} /></Router>);
    if (!orgId) return (<Router><Route path="/" render={() => <Routes.OrgSelect refer={this} />} /></Router>);

    return (
      <Router>
        <SideMenu menu={menu} openMenuOffset={200} isOpen={menuOpen} bounceBackOnOverdraw={false}>
        <Root>
          <Content>
            <TouchableOpacity onPress={this.setMenuOpen}>
              <Icon.Menu size={30} />
            </TouchableOpacity>
              <Switch>
                <Route exact={true} path="/">
                  <Routes.Dashboard refer={this} />
                </Route>
                <Route path="/canvassing">
                  <Routes.Canvassing refer={this} />
                </Route>
                <Route path="/phonebank">
                  <Routes.PhoneBank refer={this} />
                </Route>
                <Route path="/about">
                  <Routes.About refer={this} />
                </Route>
                <Route component={Routes.NoMatch} />
              </Switch>
            </Content>
          </Root>
        </SideMenu>
      </Router>
    );
  }
}

export default App;
