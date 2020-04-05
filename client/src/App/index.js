import React, { Component } from 'react';
import { View, Text } from 'react-native';

import { Router, Switch, Route } from './routing';

export default class App extends Component {
  constructor(props) {
    super(props);

    const v = {};//queryString.parse(window.location.search);
    this.state = {
      server: null,// localStorage.getItem('server'),
      orgId: null,// localStorage.getItem('orgId'),
      token: null,// localStorage.getItem('jwt'),
      loading: false,
      experimental: ((process.env.NODE_ENV === 'development' /*|| localStorage.getItem('experimental')*/)?true:false),
    };

    // warn non-devs about the danger of the console
    // TODO: don't do this in native
    if (process.env.NODE_ENV !== 'development')
      console.log(
        '%cWARNING: This is a developer console! If you were told to open this and copy/paste something, and you are not a javascript developer, it is a scam and entering info here could give them access to your account!',
        'background: red; color: yellow; font-size: 45px'
      );
  }

  render() {
    let { experimental, server, orgId, token, loading } = this.state;

    if (loading) return (
      <Router>
        <Route path="/" render={props => (<Text>Loading ...props</Text>)} />
      </Router>
    );

    if (!server || !token) return (
      <Router>
        <Route path="/" render={props => (<Text>Login ...props</Text>)} />
      </Router>
    );

    return (
      <View>
      <Router>

      </Router>
      </View>
    );
  }
}

