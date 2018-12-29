import React, { Component } from 'react';

import { Route, Redirect } from 'react-router'
import jwt_decode from 'jwt-decode';
import {notify_error} from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    let jwt;

    try {
      jwt = this.props.location.pathname.split('/').pop();
      jwt_decode(jwt);
      this.props.refer._loadData(jwt);
    } catch (e) {
      notify_error(e, "Unable to extract jwt from URI");
      jwt = 'error';
    }

    this.state = {jwt: jwt};
  }

  render() {
    if (this.state.jwt === 'error') return (<div>There was an error parsing the jwt</div>);

    return (
      <Route render={() => (
        <Redirect to="/" />
      )} />
    )
  }
}
