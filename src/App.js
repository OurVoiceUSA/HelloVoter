import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import t from 'tcomb-form';
import jwt_decode from 'jwt-decode';
import queryString from 'query-string';

import Dashboard from './components/Dashboard';
import Canvassers from './components/Canvassers';
import Teams from './components/Teams';
import Turf from './components/Turf';
import Forms from './components/Forms';
import Map from './components/Map';
import ImportData from './components/ImportData';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Jwt from './components/Jwt';
import About from './components/About';

import { _fetch, Root, Sidebar, SidebarItem, Main, Icon } from './common.js';

import { faColumns, faUser, faUsers, faMap, faGlobe, faClipboard, faChartPie,
         faFileUpload, faSignOutAlt, faAward, faCog } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

class App extends Component {

  constructor(props) {
    super(props);

    const v = queryString.parse(window.location.search);

    this.state = {
      server: {
        hostname: localStorage.getItem('server'),
        jwt: localStorage.getItem('jwt'),
      },
      connectForm: {server: v.server},
    };

    this.formServerItems = t.struct({
      server: t.String,
      ack: t.subtype(t.Boolean, function (s) { return s }), // boolean that fails validation if not selected
    });

    this.formServerOptions = {
      fields: {
        server: {
          label: 'Server Domain Name',
          help: 'Enter the domain name of the server you wish to connect to.',
          error: 'You must enter a domain name.',
        },
        ack: {
          label: 'Terms of Use',
          help: 'By checking this you acknowledge that the server to which you are connecting is not affiliated with Our Voice USA and the data you send and receive is governed by that server\'s terms of use.',
          error: 'You must acknowledge the terms of use.',
        },
      },
    };

    this.onChange = this.onChange.bind(this);
    this.doSave = this.doSave.bind(this);

  }

  componentDidMount() {
    this._loadKeys();
  }

  _loadKeys = async () => {
    if (!this.state.server.hostname) return;

    let res = await _fetch(this.state.server, '/canvass/v1/google_maps_key')
    let data = await res.json();

    // load google places API
    var aScript = document.createElement('script');
    aScript.type = 'text/javascript';
    aScript.src = "https://maps.googleapis.com/maps/api/js?key="+data.google_maps_key+"&libraries=places";
    document.head.appendChild(aScript);

    this.setState({google_maps_key: data.google_maps_key});
  }

  onChange(connectForm) {
    this.setState({connectForm})
  }

  getName() {
    let name;

    try {
      name = jwt_decode(this.state.server.jwt).name;
    } catch (e) {
      console.warn(e);
    }

    return name;
  }

  _logout() {
    localStorage.removeItem('server');
    localStorage.removeItem('jwt');
    this.setState({server: {}});
  }

  doSave = async () => {

    let json = this.refs.mainForm.getValue();
    if (json === null) return;

    if (json.ack !== true) return;

    let ret = await this.singHello(json.server);

    if (ret.flag !== true) console.warn((ret.error?'Error':'Connection Successful'), ret.msg, [{text: 'OK'}], { cancelable: false });
    else console.warn(ret)

  }

  singHello = async (server) => {
    let res;

    localStorage.setItem('server', server);

    try {
      res = await fetch('https://'+server+'/canvass/v1/hello', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.state.jwt?this.state.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({longitude: -118, latitude: 40}),
      });

      let sm_oauth_url = res.headers.get('x-sm-oauth-url');

      if (!sm_oauth_url) return {error: true, msg: "Missing required header."}

      switch (res.status) {
        case 200:
          break; // valid - break to proceed
        case 400:
          return {error: true, msg: "The server didn't understand the request sent from this device."};
        case 401:
          window.location.href = sm_oauth_url+"/gm?app=HelloVoter";
          return {error: false, flag: true};
        case 403:
          return {error: true, msg: "We're sorry, but your request to canvass with this server has been rejected."};
        default:
          return {error: true, msg: "Unknown error connecting to server."};
      }

      let body = await res.json();

      console.warn(body);

      this.setState({server: {hostname: server}});
      localStorage.setItem('server', server);

      if (body.data.ready !== true) return {error: false, msg: "The server said: "+body.msg};
      else {
        // TODO: use form data from body.data.forms[0] and save it in the forms_local cache
        // TODO: if there's more than one form in body.data.forms - don't navigate
        console.warn({server: server, dbx: null, user: this.state.user});
        return {error: false, flag: true};
      }
    } catch (e) {
      console.warn("singHello: "+e);
      return {error: true, msg: "Unable to make a connection to target server"};
    }

  }

  render() {
    let { server } = this.state;

    if (!server.hostname) {
      return (
        <div align="center">
          <br />
          <strong>{process.env.REACT_APP_NAME}</strong>
          <div>Version {process.env.REACT_APP_VERSION}</div>
          <br />
          <t.form.Form
            ref="mainForm"
            type={this.formServerItems}
            options={this.formServerOptions}
            onChange={this.onChange}
            value={this.state.connectForm}
          />
          <div className="form-group">
            <button type="submit" className="btn btn-primary" onClick={this.doSave}>Connect to Server</button>
          </div>
        </div>
      );
    }

    return (
    <Router>
      <Root>
        <Sidebar>
          <div style={{margin: 10}}>Welcome, {this.getName()}!<br />Server: {this.state.server.hostname}</div>
          <hr />
          <SidebarItem><Icon icon={faColumns} /> <Link to={'/'}>Dashboard</Link></SidebarItem>
          <SidebarItem><Icon icon={faUser} /> <Link to={'/canvassers/'}>Canvassers</Link></SidebarItem>
          <SidebarItem><Icon icon={faUsers} /> <Link to={'/teams/'}>Teams</Link></SidebarItem>
          <SidebarItem><Icon icon={faMap} /> <Link to={'/turf/'}>Turf</Link></SidebarItem>
          <SidebarItem><Icon icon={faClipboard} /> <Link to={'/forms/'}>Forms</Link></SidebarItem>
          <SidebarItem><Icon icon={faGlobe} /> <Link to={'/map/'}>Map</Link></SidebarItem>
          <SidebarItem><Icon icon={faFileUpload} /> <Link to={'/import/'}>Import Data</Link></SidebarItem>
          <SidebarItem><Icon icon={faChartPie} /> <Link to={'/analytics/'}>Analytics</Link></SidebarItem>
          <SidebarItem><Icon icon={faCog} /> <Link to={'/settings/'}>Settings</Link></SidebarItem>
          <SidebarItem><Icon icon={faSignOutAlt} /> <button onClick={() => this._logout()}>Logout</button></SidebarItem>
          <hr />
          <SidebarItem><Icon icon={faAward} /> <Link to={'/about/'}>About</Link></SidebarItem>
          <SidebarItem><Icon icon={faGithub} /> <a target="_blank" rel="noopener noreferrer" href="https://github.com/OurVoiceUSA/HelloVoter/tree/master/docs/">Help</a></SidebarItem>
        </Sidebar>
        <Main>
          <Route exact={true} path="/" render={() => <Dashboard server={server} />} />
          <Route path="/canvassers/" render={(props) => <Canvassers server={server} {...props} />} />
          <Route path="/teams/" render={() => <Teams server={server} />} />
          <Route path="/turf/" render={() => <Turf server={server} />} />
          <Route path="/forms/" render={() => <Forms server={server} />} />
          <Route path="/map/" render={() => <Map server={server} apiKey={this.state.google_maps_key} />} />
          <Route path="/import/" render={() => <ImportData server={server} />} />
          <Route path="/analytics/" render={() => <Analytics server={server} />} />
          <Route path="/settings/" render={() => <Settings server={server} />} />
          <Route path="/jwt/" render={(props) => <Jwt {...props} refer={this} />} />
          <Route path="/about/" render={() => <About server={server} />} />
        </Main>
      </Root>
    </Router>
    );
  }
}

export default App;
