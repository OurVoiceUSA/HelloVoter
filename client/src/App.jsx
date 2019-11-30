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
  _fetch,
  notify_error
} from './common.js';

import styles from './app.styles';

class App extends Component {
  constructor(props) {
    super(props);

    const v = queryString.parse(window.location.search);
    this.state = {
      global: props.global,
      assignments: {},
      loading: true,
      open: true,
      menuLogout: false,
      server: localStorage.getItem('server'),
      token: localStorage.getItem('jwt'),
      orgId: localStorage.getItem('orgId'),
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

  _loadData = async () => {
    let { server, token, orgId } = this.state;

    this.setState({loading: true});

    // assume error unless proven otherwise
    let hai = {error: true};

    try {
      if (server && token) {
        hai = await this.singHello(server, jwt.decode(token)['id'].split(":")[0], token, orgId);
      } else {
        throw new Error("missing server or token");
      }

      if (hai.error) {
        throw new Error("hai error")
      }
    } catch (e) {
      // if we had a token, it was bad, clear everything
      if (token && server) {
        this.setState({server: null, token: null, orgId: null});
        localStorage.clear();
        console.warn("Cleaning localStorage");
      }
      console.warn(e);
    }

    this.setState({
      loading: false,
      assignments: (hai.data?hai.data:{}),
    }, () => this._loadKeys());

  };

  _loadKeys = async () => {
    const { global } = this.state;

    // don't load if already loaded
    if (this.state.google_maps_key) return;
    if (!this.state.server) return;

    let data;

    try {
      data = await _fetch(global, '/google_maps_key');
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

    if (!this.state.token) return null;

    try {
      item = jwt.decode(this.state.token)[prop];
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
    this.setState({ menuLogout: false, server: null, token: null, orgId: null });
  };

  doSave = async (event, target) => {
    let server;
    let orgId;

    if (event.target.orgId) {
      orgId = event.target.orgId.value;
      let place = orgId.substring(0,2).toLowerCase();
      server = 'gotv-'+place+'.ourvoiceusa.org';
    } else if (event.target.server) {
      server = event.target.server.value;
    } else {
      server = window.location.host.replace(':3000',':8080');
    }
    if (process.env.REACT_APP_NO_AUTH) {
      // TODO: ask developer for username and generate a token with it
      let token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im5vYXV0aDpsb2NhbHVzZXIiLCJuYW1lIjoiTG9jYWwgVXNlciIsImVtYWlsIjoibG9jYWxAbG9jYWxob3N0IiwiaXNzIjoib3Vydm9pY2V1c2Eub3JnIiwiaWF0IjoxLCJleHAiOjIsImRpc2NsYWltZXIiOiJCbGFoIGJsYWggZGlzY2xhaW1lciJ9.qa5K2pgi1uLYkV7jP3aNvazcchvgBD8RwhdG6Q86GxlvusQx7nNCTr3LrAnn6pxDJxNidJoqjD3Ie77jj5hWK_-lbgtHMLhNXGExDxI8pQ0I5ZnAV_5pDu7vARinoy3mctQWFO2pIQSu8KzQc7eQ90IQZBseE7nQV-ugZRfK8Teo_48COcJxGxqwCNCO80G_JzBoif2xaWRb2i2n0qeSUKfXN4Fwy46JOiHFnL9yOS5s54tB6doe1wFJNYps8eVQbVkTBL1I9PQP4Gs-BmzND0vcQaczTdu_J50uvLL5do1FHb48lRhrA44ZrYv3EVwNsJXZtH3MbasxgPrZhl69VQ';
      localStorage.setItem('jwt', token);
      this.setState({token}, () => this.singHello(server, target, null, orgId));
    }
    else await this.singHello(server, target, null, orgId);
  };

  singHello = async (server, target, token, orgId) => {
    let res;

    localStorage.setItem('server', server);
    if (orgId) localStorage.setItem('orgId', orgId);
    this.setState({server, orgId});

    let https = true;
    if (server.match(/:8080$/)) https = false;

    try {
      res = await fetch('http'+(https?'s':'')+'://' + server + '/HelloVoterHQ/'+(orgId?orgId+'/':'')+'api/v1/hello', {
        method: 'POST',
        headers: {
          Authorization:
            'Bearer ' +
            (token ? token : (this.state.token ? this.state.token : 'of the one ring')),
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
        setTimeout(() => {
          window.location.href = sm_oauth_url + '/'+sm+'/?app=HelloVoterHQ'+(https?'':'&local=true');
        }, 500);
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
        return { error: false, msg: 'The server said: ' + body.msg, data: body.data };
      else {
        // TODO: use form data from body.data.forms[0] and save it in the forms_local cache
        // TODO: if there's more than one form in body.data.forms - don't navigate
        console.warn({ user: this.state.user });
        return { error: false, flag: true, data: body.data };
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
    let { assignments, server, token, loading } = this.state;

    if (loading) return (
      <Router>
        <Route path="/" render={props => <Loading {...props}  />} />
      </Router>
    );

    if (!server || !token) return (
      <Router>
        <Route path="/" render={props => <Login {...props} global={this} />} />
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
            global={this}
            getUserProp={this.getUserProp}
            handleDrawerOpen={this.handleDrawerOpen}
          />
          <Sidebar
            assignments={assignments}
            classes={classes}
            open={this.state.open}
            getUserProp={this.getUserProp}
            handleClickLogout={this.handleClickLogout}
            handleDrawerClose={this.handleDrawerClose}
          />
          <main className={classes.content}>
            <div className={classes.appBarSpacer} />
            <NotificationContainer />
            <Routes global={this} />
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
