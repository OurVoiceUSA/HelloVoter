import React, { Component } from 'react';

import { HashRouter as Router, Route } from 'react-router-dom';

import { RootLoader, CardCanvasser, _loadCanvassers } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      canvassers: [],
    };
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    this.setState({canvassers: await _loadCanvassers(this),});
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
            <RootLoader flag={this.state.loading} func={() => this._loadData()}>
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
            <CardCanvasser key={props.match.params.id} id={props.match.params.id} edit={true} refer={this} />
          )} />
        </div>
      </Router>
    );
  }
}
