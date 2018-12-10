import React, { Component } from 'react';

import { Route, Redirect } from 'react-router'
import jwt_decode from 'jwt-decode';

export default class App extends Component {

  constructor(props) {
    super(props);

    let jwt;

    try {
      jwt = this.props.location.pathname.split('/').pop();
      jwt_decode(jwt);
    } catch (e) {
      console.warn("Unable to extract jwt from URI: "+e);
      jwt = 'error';
    }

    this.state = {jwt: jwt};
    this.props.refer.setState({jwt: jwt});
    localStorage.setItem('jwt', jwt);
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
