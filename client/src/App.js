import React, { Component } from 'react';
import { ActivityIndicator, Linking, Platform, Text, TouchableOpacity, SideMenu } from './lib/react-native';
import jwt_decode from 'jwt-decode';

import { Router, Switch, Route } from './lib/routing';
import { Root, Content, Space, ViewCenter } from './components/Layout';
import { MainMenu } from './components/MainMenu';
import { STORAGE_KEY_JWT } from './lib/consts';
import { SafariView } from './lib/SafariView';
import * as storage from './lib/storage';
import * as Routes from './routes';

class App extends Component {

  constructor() {
    super();

    this.state = {
      loading: true,
      token: null,
      user: null,
      menuOpen: false,
    };
  }

  componentDidMount = async () => {
    let token;

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

    if (token) this.setToken(token);

    this.setState({loading: false});
  }

  logout = async () => {
    await storage.del(STORAGE_KEY_JWT);
    this.setState({user: null, token: null, menuOpen: false});
  }

  setToken = async (token) => {
    try {
      let user = jwt_decode(token);
      await storage.set(STORAGE_KEY_JWT, token);
      this.setState({token, user});
    } catch (e) {
      this.setState({token: null, user: null});
      storage.del(STORAGE_KEY_JWT);
    }
  }

  handleOpenURL = async ({ url }) => {
    // Extract jwt token out of the URL
    const m = url.match(/jwt=([^#]+)/);

    if (m) await this.setToken(m[1]);

    SafariView.dismiss();

    this.setState({loading: false});
  }

  render() {
    const { loading, menuOpen, user } = this.state;

    const menu = (<MainMenu refer={this} />);

    if (loading) return (
      <Root>
        <Content>
          <ViewCenter>
            <Text>Loading HelloVoter...</Text>
            <Space />
            <ActivityIndicator size="large" />
          </ViewCenter>
        </Content>
      </Root>
    );
    if (!user) return (<Router><Route path="/" render={() => <Routes.LoginScreen refer={this} />} /></Router>);

    return (
      <Router>
        <SideMenu menu={menu} openMenuOffset={200} isOpen={menuOpen} bounceBackOnOverdraw={false}>
        <Root>
          <Content>
            <TouchableOpacity onPress={() => this.setState({menuOpen: true})}>
              <Text>MENU</Text>
            </TouchableOpacity>
              <Switch>
                <Route exact={true} path="/" render={() => <Routes.Dashboard refer={this} />} />
                <Route path="/canvassing" render={() => <Routes.Canvassing refer={this} />} />
                <Route path="/phonebank" render={() => <Routes.PhoneBank refer={this} />} />
                <Route path="/about" render={() => <Routes.About refer={this} />} />
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
