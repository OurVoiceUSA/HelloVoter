import React, { Component } from 'react';

import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';

import { jwt } from '../config.js';

TimeAgo.locale(en);

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
    };

  }

  componentDidMount = async () => {
    let canvassers = {};

    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/canvasser/list', {
        headers: {
          'Authorization': 'Bearer '+(jwt?jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
      });
      canvassers = await res.json();
    } catch (e) {
      console.warn(e);
    }

    this.setState({loading: false, canvassers: canvassers.data});
  }

  render() {
    return (
      <Router>
        <div>
          <Route exact={true} path="/canvassers/" render={() => {
            return (this.state.loading?'loading':this.state.canvassers.map(c => <Canvasser key={c.id} canvasser={c} />))
          }} />
          <Route path="/canvassers/:id" render={(props) => {
            return (<div>{props.match.params.id}</div>)
          }} />
        </div>
      </Router>
    );
  }
}

const Canvasser = (props) => {
  const timeAgo = new TimeAgo('en-US')
  return (
    <div>
      Name: {props.canvasser.name} (<Link to={'/canvassers/'+props.canvasser.id}>view profile</Link>)<br />
      Email: {props.canvasser.email} <br />
      Last Login: {timeAgo.format(new Date(props.canvasser.last_seen))} <br />
      Admin: {(props.canvasser.admin?'Yes':'No')}
    <hr />
    </div>
  );
}

