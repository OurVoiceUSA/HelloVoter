import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import t from 'tcomb-form';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
    };

    this.formServerItems = t.struct({
      name: t.String,
    });

    this.formServerOptions = {
      fields: {
        server: {
          label: 'Team Name',
          error: 'You must enter a team name.',
        },
      },
    };

  }

  onChangeTeam(addTeamForm) {
    this.setState({addTeamForm})
  }

  doCreateTeam = async () => {

    let json = this.addTeamForm.getValue();
    if (json === null) return;

    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/team/create', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({name: json.name}),
      });

      console.warn(res);
    } catch (e) {
      console.warn(e);
    }

  }


  componentDidMount = async () => {
    let teams = {};

    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/team/list', {
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
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
      <Router>
        <div>
          <Route exact={true} path="/teams/" render={() => (
            <div>
              {(this.state.loading?'loading':this.state.teams.map(t => <Team key={t.name} team={t} />))}
              <Link to={'/teams/add'}><button>Add Team</button></Link>
            </div>
          )} />
          <Route exact={true} path="/teams/add" render={() => (
            <div>
              <t.form.Form
                ref={(ref) => this.addTeamForm = ref}
                type={this.formServerItems}
                options={this.formServerOptions}
                onChange={(e) => this.onChangeTeam(e)}
                value={this.state.addTeamForm}
              />
              <button onClick={() => this.doCreateTeam()}>
                Submit
              </button>
            </div>
          )} />
          <Route path="/teams/edit" render={() => (
            <div>
              LIST / EDIT / etc
            </div>
          )} />
        </div>
      </Router>
    );
  }
}

const Team = (props) => (
  <div>
    Name: {props.team.name} (<Link to={'/teams/edit/'+props.team.name}>edit</Link>)<br />
  <hr />
  </div>
)

