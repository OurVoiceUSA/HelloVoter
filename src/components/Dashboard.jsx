import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import filesize from 'filesize';

import { faShieldAlt, faUser, faUsers, faMap, faClipboard, faChartPie, faMapMarkerAlt, faDatabase } from '@fortawesome/free-solid-svg-icons';

import { _fetch, notify_error, RootLoader, Icon } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      data: {},
    };
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    let data = {};

    this.setState({loading: true})

    try {
      data = await _fetch(this.props.server, '/volunteer/v1/dashboard');
    } catch (e) {
      notify_error(e, "Unable to load dashboard info.");
    }

    this.setState({data: data, loading: false});
  }

  render() {
    return (
      <RootLoader flag={this.state.loading} func={this._loadData}>
        <CardDashboard name="Volunteers" stat={this.state.data.volunteers} icon={faUser} />
        <CardDashboard name="Teams" stat={this.state.data.teams} icon={faUsers} />
        <CardDashboard name="Turfs" stat={this.state.data.turfs} icon={faMap} />
        <CardDashboard name="Forms" stat={this.state.data.forms} icon={faClipboard} />
        <CardDashboard name="Questions" stat={this.state.data.questions} icon={faChartPie} />
        <CardDashboard name="Addresses" stat={(<NumberFormat value={this.state.data.addresses} displayType={'text'} thousandSeparator={true} />)} icon={faMapMarkerAlt} />
        <CardDashboard name="Database size" stat={filesize((this.state.data.dbsize?this.state.data.dbsize:0), {round: 1})} icon={faDatabase} />
      </RootLoader>
    );
  }
}

const CardDashboard = (props) => (
  <div style={{display: 'flex', padding: '10px'}}>
    <div style={{padding: '5px 10px'}}>
      <Icon style={{width: 50, height: 50, color: "gray"}} icon={(props.icon?props.icon:faShieldAlt)} />
    </div>
    <div style={{flex: 1, overflow: 'auto'}}>
      <h3>{props.name}: {props.stat}</h3>
    </div>
  </div>
)
