import React, { Component } from 'react';

import { HashRouter as Router, Route } from 'react-router-dom';
import { NotificationContainer } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
import jwt from 'jsonwebtoken';
import queryString from 'query-string';
import ReactTooltip from 'react-tooltip';

import { Header, Sidebar, LogoutDialog, Login, Loading } from './components';
import Routes from './routes/Routes';

import 'typeface-roboto';
import { withStyles } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';

import {
  API_BASE_URI,
  _fetch,
  notify_error
} from './common.js';

import styles from './app.styles';

class App extends Component {
  constructor(props) {
    super(props);

    const v = queryString.parse(window.location.search);
    this.state = {
      loading: true,
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

  _loadData = async (t) => {
    this.setState({loading: true});

    let hostname = '';
    let token = '';
    let orgId = '';

    try {
      if (t) {
        token = t;
        localStorage.setItem('jwt', t);
      } else {
        token = localStorage.getItem('jwt');
      }

      hostname = localStorage.getItem('server');
      orgId = localStorage.getItem('orgId');

      // assume error unless proven otherwise
      let hai = {error: true};

      if (hostname && token) {
        hai = await this.singHello(hostname, jwt.decode(token)['id'].split(":")[0], token, orgId);
      }

      if (hai.error) {
        throw new Error("hai error")
      }
    } catch (e) {
      // if we had a token, it was bad, clear everything
      if (token) {
        hostname = '';
        token = '';
        orgId = '';
        localStorage.clear();
      }
      console.warn(e);
    }

    this.setState({
      server: {
        hostname: hostname,
        jwt: token,
        orgId: orgId,
      },
      loading: false,
    }, () => this._loadKeys());

  };

  _loadKeys = async () => {
    // don't load if already loaded
    if (this.state.google_maps_key) return;
    if (!this.state.server.hostname) return;

    let data;

    try {
      data = await _fetch(this.state.server, API_BASE_URI+'/google_maps_key');
      if (!data) return;

      // load google places API
      var aScript = document.createElement('script');
      aScript.type = 'text/javascript';
      aScript.src =
        'https://maps.googleapis.com/maps/api/js?key=' +
        data.google_maps_key +
        '&libraries=places';
      document.head.appendChild(aScript);

      this.setState({ google_maps_key: data.google_maps_key });
    } catch (e) {
      console.warn(e);
    }
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
    localStorage.clear();
    this.setState({ menuLogout: false, server: {} });
  };

  doSave = async (event, target) => {
    let server;
    let orgId;

    if (event.target.orgId) {
      orgId = event.target.orgId.value;
      this.setState({orgId});
      let place = orgId.substring(0,2).toLowerCase();
      server = 'gotv-'+place+'.ourvoiceusa.org';
    } else if (event.target.server) {
      server = event.target.server.value;
    } else {
      server = 'localhost:8080';
    }
    await this.singHello(server, target, null, orgId);
  };

  singHello = async (server, target, token, orgId) => {
    let res;

    localStorage.setItem('server', server);
    localStorage.setItem('orgId', orgId);

    let https = true;
    if (server.match(/^localhost/)) https = false;

    try {
      res = await fetch('http'+(https?'s':'')+'://' + server + API_BASE_URI+'/hello', {
        method: 'POST',
        headers: {
          Authorization:
            'Bearer ' +
            (token ? token : (this.state.server.jwt ? this.state.server.jwt : 'of the one ring')),
          'Content-Type': 'application/json'
        },
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
        window.location.href = sm_oauth_url + '/'+sm+'/?app=HelloVoterHQ'+(https?'':'&local=true');
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
    let { server, loading } = this.state;

    if (loading) return (
      <Router>
        <Route path="/" render={props => <Loading {...props}  />} />
      </Router>
    );

    if (!server.hostname) return (
      <Router>
        <Route path="/" render={props => <Login {...props} refer={this} />} />
      </Router>
    );

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
            getUserProp={this.getUserProp}
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
