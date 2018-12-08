import React, { Component } from 'react';

import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import t from 'tcomb-form';
import jwt_decode from 'jwt-decode';

import Dashboard from './components/Dashboard';
import Canvassers from './components/Canvassers';
import Teams from './components/Teams';
import Turf from './components/Turf';
import Questions from './components/Questions';
import Forms from './components/Forms';
import Map from './components/Map';

import { ack, jwt, wsbase } from './config.js';

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      server: localStorage.getItem('server'),
      connectForm: {server: wsbase, ack: ack},
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
  }

  onChange(connectForm) {
    this.setState({connectForm})
  }

  _logout() {
    localStorage.removeItem('server');
    this.setState({server: null});
  }

  doSave = async () => {

    let json = this.refs.mainForm.getValue();
    if (json === null) return;

    if (json.ack !== true) {
      // need to correctly trigger this.formServerOptions.fields.ack.hasError
      return;
    }

    this.setState({serverLoading: true});

    let ret = await this.singHello(json.server);

    if (ret.flag !== true) console.warn((ret.error?'Error':'Connection Successful'), ret.msg, [{text: 'OK'}], { cancelable: false });
    else console.warn(ret)

  }

  singHello = async (server) => {
    let res;

    try {
      res = await fetch('https://'+server+'/canvass/v1/hello', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(jwt?jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({longitude: -118, latitude: 40}),
      });

/*
      let auth_location = res.headers.get('x-sm-oauth-url');

      if (!auth_location || !auth_location.match(/^https:.*auth$/)) {
        // Invalid x-sm-oauth-url header means it's not a validy configured canvass-broker
        return {error: true, msg: "That server is not running software compatible with this mobile app."};
      }

      if (auth_location !== wsbase+'/auth') {
        return {error: true, msg: "Custom authentication not yet supported."};
      }
*/

      switch (res.status) {
        case 200:
          // valid - break to proceed
          break;
/*
TODO: accept a 302 redirect to where the server really is - to make things simple for the end-user
      Prompt something like: "This server uses its own user login system. You'll be taken to their site to sign in. 1. Ok, let's go! 2. Nevermind"
        case 302:
          console.warn("Re-featch based on Location header")
          break;
*/
        case 400:
          return {error: true, msg: "The server didn't understand the request sent from this device."};
        case 401:
          this.setState({ConnectServerScreen: false}, () => setTimeout(() => this.setState({SmLoginScreen: true}), 500))
          return {error: false, flag: true};
        case 403:
          return {error: true, msg: "We're sorry, but your request to canvass with this server has been rejected."};
        default:
          return {error: true, msg: "Unknown error connecting to server."};
      }

      let body = await res.json();

      console.warn(body);

      this.setState({server: server});
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
    const { server } = this.state;
    if (!server) return (
            <div>
              <t.form.Form
                ref="mainForm"
                type={this.formServerItems}
                options={this.formServerOptions}
                onChange={this.onChange}
                value={this.state.connectForm}
              />
              <button onClick={this.doSave}>
                Connect to Server
              </button>
              </div>
          );

    return (
    <Router>
      <Root>
        <Sidebar>
          <div>Welcome, {jwt_decode(jwt).name}!</div>
          <SidebarItem><Link to={'/'}>Dashboard</Link></SidebarItem>
          <SidebarItem><Link to={'/canvassers/'}>Canvassers</Link></SidebarItem>
          <SidebarItem><Link to={'/teams/'}>Teams</Link></SidebarItem>
          <SidebarItem><Link to={'/turf/'}>Turf</Link></SidebarItem>
          <SidebarItem><Link to={'/questions/'}>Questions</Link></SidebarItem>
          <SidebarItem><Link to={'/forms/'}>Forms</Link></SidebarItem>
          <SidebarItem><Link to={'/map/'}>Map</Link></SidebarItem>
          <SidebarItem><button onClick={() => this._logout()}>Logout</button></SidebarItem>
        </Sidebar>
        <Main>
          <Route exact={true} path="/" component={Dashboard} />
          <Route path="/canvassers/" render={() => <Canvassers server={this.state.server} />} />
          <Route path="/teams/" render={() => <Teams server={this.state.server} />} />
          <Route path="/turf/" render={() => <Turf server={this.state.server} />} />
          <Route path="/questions/" component={Questions} />
          <Route path="/forms/" component={Forms} />
          <Route path="/map/" component={Map} />
        </Main>
      </Root>
    </Router>
    );
  }
}

const Root = (props) => (
  <div style={{display: 'flex'}} {...props}/>
)

const Sidebar = (props) => (
  <div style={{width: '22vw', height: '100vh', overlow: 'auto', background: '#eee'}} {...props}/>
)

const SidebarItem = (props) => (
  <div style={{whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', padding: '5px 10px'}} {...props}/>
)

const Main = (props) => (
  <div style={{flex: 1, height: '100vh', overflow: 'auto'}}>
    <div style={{padding: '20px'}} {...props}/>
  </div>
)

export default App;
