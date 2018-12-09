import React, { Component } from 'react';

import { Route, Redirect } from 'react-router'
import jwt_decode from 'jwt-decode';

export default class App extends Component {

  componentDidMount() {
    let jwt;

    try {
      jwt = this.props.location.pathname.split('/')[2];
      jwt_decode(jwt);
    } catch (e) {
      console.warn("Unable to extract jwt from URI: "+e);
      jwt = 'error';
    }

    sessionStorage.setItem('jwt', jwt);
  }

  render() {
    return (
      <Route render={() => (
        <Redirect to="/" />
      )} />
    )
  }
}
