import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import Loader from 'react-loader-spinner';
import Img from 'react-image';

import { Icon } from '../common.js';

import { faCrown, faUser, faSync } from '@fortawesome/free-solid-svg-icons';

TimeAgo.locale(en);

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
    let canvassers = [];

    this.setState({loading: true})

    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/canvasser/list', {
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
      });
      let data = await res.json();
      canvassers = (data.data?data.data:[]);
    } catch (e) {
      console.warn(e);
    }

    this.setState({loading: false, canvassers: canvassers});
  }

  render() {
    return (
      <Router>
        <div>
          <Icon icon={faSync} color="green" onClick={() => this._loadData()} />
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
  const timeAgo = new TimeAgo('en-US');
  return (
    <div style={{display: 'flex', padding: '10px'}}>
      <div style={{padding: '5px 10px'}}>
        <Img width={50} src={props.canvasser.avatar} loader={<Loader width={50} type="ThreeDots" />} unloader={<Icon style={{width: 50, height: 50, color: "gray"}} icon={faUser} />} />
      </div>
      <div style={{flex: 1, overflow: 'auto'}}>
        Name: {props.canvasser.name} (<Link to={'/canvassers/'+props.canvasser.id}>view profile</Link>) {(props.canvasser.admin?<Icon icon={faCrown} color="gold" />:'')}<br />
        Email: {props.canvasser.email} <br />
        Last Login: {timeAgo.format(new Date(props.canvasser.last_seen-30000))}
      </div>
    </div>
  );
}
