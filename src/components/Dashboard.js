import React, { Component } from 'react';

import { _fetch, RootLoader } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
    };
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    let data = {};

    this.setState({loading: true})

    try {
      let res = await _fetch(this.props.server, '/canvass/v1/dashboard');

      data = await res.json();
    } catch (e) {
      console.warn(e);
    }

    this.setState({data: data, loading: false});
  }

  render() {
    return (
      <RootLoader flag={this.state.loading} func={this._loadData}>
        {JSON.stringify(this.state.data)}
      </RootLoader>
    );
  }
}
