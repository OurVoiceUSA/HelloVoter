import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';

import { RootLoader, CardTurf } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      turf: [],
    };

  }

  componentDidMount() {
    this._loadData();
  }

  // TODO: use _loadTurf()
  _loadData = async () => {
    let turf = {};

    this.setState({loading: true});

    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/turf/list', {
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
      });
      turf = await res.json();
    } catch (e) {
      console.warn(e);
    }

    this.setState({loading: false, turf: turf.data});
  }

  render() {
    return (
      <RootLoader flag={this.state.loading} func={this._loadData}>
        {this.state.turf.map(t => <CardTurf key={t.name} turf={t} />)}
      </RootLoader>
    );
  }
}
