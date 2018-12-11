import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import Img from 'react-image';

import { Loader, RootLoader, Icon } from '../common.js';

import { faCrown, faUser } from '@fortawesome/free-solid-svg-icons';

TimeAgo.locale(en);

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      canvassers: [],
      thisCanvasser: {},
    };

  }

  componentDidMount() {
    this._loadCanvassers();
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

  _loadCanvassers = async () => {
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
          <Route exact={true} path="/canvassers/" render={() => (
            <RootLoader flag={this.state.loading} func={this._loadCanvassers}>
              {this.state.canvassers.map(c => (<Canvasser key={c.id} canvasser={c} refer={this} />))}
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

const Canvasser = (props) => {
  const timeAgo = new TimeAgo('en-US');
  return (
    <div style={{display: 'flex', padding: '10px'}}>
      <div style={{padding: '5px 10px'}}>
        <Img width={50} src={props.canvasser.avatar} loader={<Loader width={50} />} unloader={<Icon style={{width: 50, height: 50, color: "gray"}} icon={faUser} />} />
      </div>
      <div style={{flex: 1, overflow: 'auto'}}>
        Name: {props.canvasser.name} (<Link to={'/canvassers/'+props.canvasser.id} onClick={() => props.refer.setState({thisCanvasser: props.canvasser})}>view profile</Link>) {(props.canvasser.admin?<Icon icon={faCrown} color="gold" />:'')}<br />
        Email: {props.canvasser.email} <br />
        Last Login: {timeAgo.format(new Date(props.canvasser.last_seen-30000))}
      </div>
    </div>
  );
}
