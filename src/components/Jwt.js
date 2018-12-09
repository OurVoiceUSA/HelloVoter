import React, { Component } from 'react';

import { Route, Redirect } from 'react-router'

export default class App extends Component {

  componentDidMount() {
    try {
      localStorage.setItem('jwt', this.props.location.pathname.split('/')[2]);
    } catch (e) {
      console.warn("Unable to save jwt");
    }
  }

  render() {
    return (
      <Route render={() => (
        <Redirect to="/"/>
      )} />
    )
  }
}
