import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';

import { Loader, RootLoader, CardCanvasser, _loadCanvassers } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      canvassers: [],
      thisCanvasser: {},
    };

  }

  componentDidMount = async () => {
    this.setState({canvassers: await _loadCanvassers(this)});
  }

  _loadSingle = async () => {
    let c = {};

    this.setState({loading: true})

    try {
      let id = this.props.location.pathname.split('/').pop();

      let res = await fetch('https://'+this.props.server+'/canvass/v1/canvasser/get?id='+id, {
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
      });
      let data = await res.json();
      c = (data.data?data.data:{});
    } catch (e) {
      console.warn(e);
    }

    this.setState({loading: false, thisCanvasser: c});
  }

  render() {
    return (
      <Router>
        <div>
          <Route exact={true} path="/canvassers/" render={() => (
            <RootLoader flag={this.state.loading} func={async () => this.setState({canvassers: await _loadCanvassers(this)})}>
              {this.state.canvassers.map(c => (<CardCanvasser key={c.id} canvasser={c} refer={this} />))}
            </RootLoader>
          )} />
          <Route path="/canvassers/:id" render={(props) => (
            <RootLoader flag={this.state.loading} func={this._loadSingle}>
              {JSON.stringify(this.state.thisCanvasser)}
            </RootLoader>
          )} />
        </div>
      </Router>
    );
  }
}
