import React, { Component } from 'react';

import { jwt } from '../config.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
    };

  }

  componentDidMount = async () => {
    let teams = {};

    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/team/list', {
        headers: {
          'Authorization': 'Bearer '+(jwt?jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
      });
      teams = await res.json();
    } catch (e) {
      console.warn(e);
    }

    this.setState({loading: false, teams: teams.data});
  }

  render() {
    return (
      <div>
        {(this.state.loading?'loading':this.state.teams.map(t => <Team key={t.id} team={t} />))}
      </div>);
  }
}

const Team = (props) => (
  <div>
    Name: {props.team.name} <br />
  <hr />
  </div>
)

