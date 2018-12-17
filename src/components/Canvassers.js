import React, { Component } from 'react';

import { HashRouter as Router, Route } from 'react-router-dom';

import { RootLoader, CardCanvasser, _loadCanvassers } from '../common.js';

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
    this._loadCanvassers();
  }

  _loadCanvassers = async () => {
    this.setState({canvassers: await _loadCanvassers(this)});
  }

  _lockCanvasser = async (canvasser, flag) => {

    try {
      await fetch('https://'+this.props.server+'/canvass/v1/canvasser/'+(flag?'lock':'unlock'), {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({id: canvasser.id}),
      });
    } catch (e) {
      console.warn(e);
    }

    this._loadCanvassers();
    window.location.href = "/HelloVoter/#/canvassers/";
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

    let denied = [];
    let ready = [];
    let unassigned = [];

    this.state.canvassers.forEach(c => {
      if (c.locked) {
        denied.push(<CardCanvasser key={c.id} canvasser={c} refer={this} />)
      } else {
        if (c.ass.ready)
          ready.push(<CardCanvasser key={c.id} canvasser={c} refer={this} />)
        else
          unassigned.push(<CardCanvasser key={c.id} canvasser={c} refer={this} />);
      }
    });

    return (
      <Router>
        <div>
          <Route exact={true} path="/canvassers/" render={() => (
            <RootLoader flag={this.state.loading} func={() => this._loadCanvassers()}>
              {unassigned.length?
              <div>
                <h3>Unassigned Canvassers ({unassigned.length})</h3>
                {unassigned}
              </div>
              :''}
              <h3>Canvassers ({ready.length})</h3>
              {ready}
              {denied.length?
              <div>
                <h3>Denied access ({denied.length})</h3>
                {denied}
              </div>
              :''}
            </RootLoader>
          )} />
          <Route path="/canvassers/:id" render={(props) => (
            <RootLoader flag={this.state.loading} func={this._loadSingle}>
              <CardCanvasser key={this.state.thisCanvasser.id} canvasser={this.state.thisCanvasser} edit={true} refer={this} />
              <br />
              Email: {(this.state.thisCanvasser.email?this.state.thisCanvasser.email:'N/A')}
              <br />
              Phone: {(this.state.thisCanvasser.phone?this.state.thisCanvasser.phone:'N/A')}
              <br />
              # of doors knocked: 0
            </RootLoader>
          )} />
        </div>
      </Router>
    );
  }
}
