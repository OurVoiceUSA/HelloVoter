import React, { Component } from 'react';

import { HashRouter as Router } from 'react-router-dom';
import { NotificationContainer } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
import jwt from 'jsonwebtoken';
import queryString from 'query-string';
import ReactTooltip from 'react-tooltip';

import { Header, Sidebar, LogoutDialog, Login } from './components';
import Routes from './routes/Routes';

import 'typeface-roboto';
import { withStyles } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';

import { _fetch, notify_error } from './common.js';
import styles from './app.styles';

class App extends Component {
  constructor(props) {
    super(props);

    const v = queryString.parse(window.location.search);
    this.state = {
      open: true,
      menuLogout: false,
      server: {},
      qserver: v.server
    };

    // warn non-devs about the danger of the console
    if (process.env.NODE_ENV !== 'development')
      console.log(
        '%cWARNING: This is a developer console! If you were told to open this and copy/paste something, and you are not a javascript developer, it is a scam and entering info here could give them access to your account!',
        'background: red; color: yellow; font-size: 45px'
      );
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async jwt => {
    let mock = false;

    if (jwt) localStorage.setItem('jwt', jwt);

    let hostname = localStorage.getItem('server');
    if (hostname === 'npm start') mock = true;

    this.setState({
      server: {
        hostname: localStorage.getItem('server'),
        jwt: jwt ? jwt : localStorage.getItem('jwt'),
        mock: mock
      }
    });

    // don't load if no jwt
    if (jwt) this._loadKeys();
  };

  _loadKeys = async () => {
    // don't load if already loaded
    if (this.state.google_maps_key) return;

    let data = await _fetch(this.state.server, '/volunteer/v1/google_maps_key');

    // load google places API
    var aScript = document.createElement('script');
    aScript.type = 'text/javascript';
    aScript.src =
      'https://maps.googleapis.com/maps/api/js?key=' +
      data.google_maps_key +
      '&libraries=places';
    document.head.appendChild(aScript);

    this.setState({ google_maps_key: data.google_maps_key });
  };

  handleClickLogout = () => {
    this.setState({ menuLogout: true });
  };

  handleCloseLogout = () => {
    this.setState({ menuLogout: false });
  };

  onChange = connectForm => {
    this.setState({ connectForm });
  };

  getUserProp = prop => {
    let item;

    if (!this.state.server.jwt) return null;

    try {
      item = jwt.decode(this.state.server.jwt)[prop];
    } catch (e) {
      notify_error(
        e,
        'Holy crap this error should never happen!! Better dust off that résumé...'
      );
      console.warn(e);
    }
    return item;
  };

  _logout = () => {
    localStorage.removeItem('server');
    localStorage.removeItem('jwt');
    this.setState({ menuLogout: false, server: {} });
  };

  doSave = async (event, target, user) => {
    // mocked user
    if (user) {
      let token = jwt.sign(user, 'shhhhh');
      localStorage.setItem('server', 'npm start');
      localStorage.setItem('jwt', token);
      this.setState({
        server: {
          hostname: 'npm start',
          jwt: token,
          mock: true
        }
      });
    } else {
      // live poll
      await this.singHello(event.target.server.value, target);
    }
  };

  singHello = async (server, target) => {
    let res;

    localStorage.setItem('server', server);

    try {
      res = await fetch('https://' + server + '/volunteer/v1/hello', {
        method: 'POST',
        headers: {
          Authorization:
            'Bearer ' +
            (this.state.server.jwt ? this.state.server.jwt : 'of the one ring'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ longitude: -118, latitude: 40 })
      });

      let sm_oauth_url = res.headers.get('x-sm-oauth-url');

      if (!sm_oauth_url)
        return { error: true, msg: 'Missing required header.' };

      switch (res.status) {
      case 200:
        break; // valid - break to proceed
      case 400:
        return {
          error: true,
          msg:
              'The server didn\'t understand the request sent from this device.'
        };
      case 401:
        let sm = '';
        if (target === 'google') sm = 'gm';
        if (target === 'facebook') sm = 'fm';
        window.location.href = sm_oauth_url + '/'+sm+'/?app=HelloVoterHQ';
        return { error: false, flag: true };
      case 403:
        return {
          error: true,
          msg:
              'We\'re sorry, but your request to volunteer with this server has been rejected.'
        };
      default:
        return { error: true, msg: 'Unknown error connecting to server.' };
      }

      let body = await res.json();

      if (body.data.ready !== true)
        return { error: false, msg: 'The server said: ' + body.msg };
      else {
        // TODO: use form data from body.data.forms[0] and save it in the forms_local cache
        // TODO: if there's more than one form in body.data.forms - don't navigate
        console.warn({ server: server, dbx: null, user: this.state.user });
        return { error: false, flag: true };
      }
    } catch (e) {
      console.warn('singHello: ' + e);
      return {
        error: true,
        msg: 'Unable to make a connection to target server'
      };
    }
  };

  handleDrawerOpen = () => {
    this.setState({ open: true });
  };

  handleDrawerClose = () => {
    this.setState({ open: false });
  };

  render() {
    const { classes } = this.props;
    let { server } = this.state;

    if (!server.hostname) return <Login refer={this} />;

    return (
      <Router>
        <div className={classes.root}>
          <ReactTooltip />
          <CssBaseline />
          <Header
            open={this.state.open}
            classes={classes}
            server={server}
            getUserProp={this.getUserProp}
            handleDrawerOpen={this.handleDrawerOpen}
          />
          <Sidebar
            classes={classes}
            open={this.state.open}
            handleClickLogout={this.handleClickLogout}
            handleDrawerClose={this.handleDrawerClose}
          />
          <main className={classes.content}>
            <div className={classes.appBarSpacer} />
            <NotificationContainer />
            <Routes
              server={server}
              refer={this}
              google_maps_key={this.state.google_maps_key}
            />
            <LogoutDialog
              menuLogout={this.state.menuLogout}
              handleCloseLogout={this.handleCloseLogout}
              _logout={this._logout}
            />
          </main>
        </div>
      </Router>
    );
  }
}

export default withStyles(styles)(App);
