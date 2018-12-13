import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import t from 'tcomb-form';
import Select from 'react-select';

import { faUsers } from '@fortawesome/free-solid-svg-icons';

import { RootLoader, Loader, Icon, CardCanvasser, _loadCanvassers } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      saving: false,
      selectedOption: null,
      teams: [],
      options: [{ value: 'loading', label: (<Loader />) }],
      thisTeam: null,
      thisTeamMembers: [],
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

  handleChange = (selectedOption) => {
    this.setState({ selectedOption });
  }

  _saveTeam = async () => {

    this.setState({saving: true});

    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/team/members/wipe', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({teamName: this.state.thisTeam}),
      });
    } catch (e) {
      console.warn(e);
    }

    this.state.selectedOption.map(async (c) => {
      try {
        let res = await fetch('https://'+this.props.server+'/canvass/v1/team/members/add', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({teamName: this.state.thisTeam, cId: c.id}),
        });
      } catch (e) {
        console.warn(e);
      }
    });

    this.setState({saving: false});
  }

  _deleteTeam = async () => {
    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/team/delete', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({name: this.state.thisTeam}),
      });
    } catch (e) {
      console.warn(e);
    }
    window.location.href = "/HelloVoter/#/teams/";
    this._loadTeams();
  }

  _createTeam = async () => {
    let json = this.addTeamForm.getValue();
    if (json === null) return;

    let res = await fetch('https://'+this.props.server+'/canvass/v1/team/create', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({name: json.name}),
    });
    window.location.href = "/HelloVoter/#/teams/";
    this._loadTeams();
  }

  componentDidMount() {
    this._loadTeams();
  }

  _loadTeams = async () => {
    let teams = {};

    this.setState({loading: true})

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

    this.setState({teams: teams.data});

    // also load canvassers
    let canvassers = await _loadCanvassers(this);
    let options = [];

    canvassers.map((c) => {
      options.push({value: c.name+c.email+c.location, id: c.id, label: (<CardCanvasser key={c.id} canvasser={c} refer={this} />)})
    });

    this.setState({options: options})
  }

  render() {
    return (
      <Router>
        <div>
          <Route exact={true} path="/teams/" render={() => (
            <RootLoader flag={this.state.loading} func={this._loadTeams}>
              {(this.state.loading?'loading':this.state.teams.map(t => <Team key={t.name} team={t} refer={this} />))}
              <Link to={'/teams/add'}><button>Add Team</button></Link>
            </RootLoader>
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
              <button onClick={() => this._createTeam()}>
                Submit
              </button>
            </div>
          )} />
          <Route path="/teams/edit/:name" render={() => (
            <div>
              <h3>{this.state.thisTeam}</h3>
              <Select
                value={this.state.selectedOption}
                onChange={this.handleChange}
                options={this.state.options}
                isMulti={true}
                isSearchable={true}
                placeholder="Select team members to add"
              />
              <br />
              {(this.state.saving?<Loader />:<button onClick={() => this._saveTeam()}>Save Team</button>)}
              <br />
              <br />
              <br />
              <button onClick={() => this._deleteTeam()}>Delete Team</button>
            </div>
          )} />
        </div>
      </Router>
    );
  }
}

const Team = (props) => {
  return (
    <div style={{display: 'flex', padding: '10px'}}>
      <div style={{padding: '5px 10px'}}>
        <Icon style={{width: 35, height: 35, color: "gray"}} icon={faUsers} />
      </div>
      <div style={{flex: 1, overflow: 'auto'}}>
        {props.team.name} (<Link to={'/teams/edit/'+props.team.name} onClick={async () => {
          props.refer.setState({thisTeam: props.team.name, selectedOption: null});

          let options = [];
          let canvassers = await _loadCanvassers(props.refer, props.team.name);

          canvassers.map((c) => {
            options.push({value: c.name+c.email+c.location, id: c.id, label: (<CardCanvasser key={c.id} canvasser={c} refer={props.refer} />)})
          });

          props.refer.setState({selectedOption: options})

        }}>edit</Link>)
      </div>
    </div>
  );
}
