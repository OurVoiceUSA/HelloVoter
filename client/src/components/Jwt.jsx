import React, { Component } from 'react';

import { Route, Redirect } from 'react-router';
import jwt from 'jsonwebtoken';
import {notify_error} from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    let token;

    try {
      token = this.props.location.pathname.split('/').pop();
      jwt.decode(token);
      this.props.refer._loadData(token);
    } catch (e) {
      notify_error(e, 'Unable to extract jwt from URI');
      token = 'error';
    }

    this.state = {token: token};
  }

  render() {
    if (this.state.token === 'error') return (<div>There was an error parsing the jwt</div>);

    return (
      <Route render={() => (
        <Redirect to="/" />
      )} />
    );
  }
}
