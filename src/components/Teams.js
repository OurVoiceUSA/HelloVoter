import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import t from 'tcomb-form';
import Select from 'react-select';

import { faUsers } from '@fortawesome/free-solid-svg-icons';

import { RootLoader, Loader, Icon, CardCanvasser, _loadCanvassers, CardTurf, _loadTurf, CardForm, _loadForms } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      saving: false,
      selectedMembersOption: null,
      selectedTurfOption: null,
      selectedFormOption: null,
      teams: [],
      thisTeam: null,
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

  handleMembersChange = (selectedMembersOption) => {
    this.setState({ selectedMembersOption });
  }

  handleTurfChange = (selectedTurfOption) => {
    this.setState({ selectedTurfOption });
  }

  handleFormChange = (selectedFormOption) => {
    this.setState({ selectedFormOption });
  }

  _saveTeam = async () => {

    this.setState({saving: true});

    try {
      await fetch('https://'+this.props.server+'/canvass/v1/team/members/wipe', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({teamName: this.state.thisTeam}),
      });

      await fetch('https://'+this.props.server+'/canvass/v1/team/turf/wipe', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({teamName: this.state.thisTeam}),
      });

      await fetch('https://'+this.props.server+'/canvass/v1/team/form/wipe', {
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

    this.state.selectedMembersOption.map(async (c) => {
      try {
        await fetch('https://'+this.props.server+'/canvass/v1/team/members/add', {
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

    try {
      await fetch('https://'+this.props.server+'/canvass/v1/team/turf/add', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({teamName: this.state.thisTeam, turfName: this.state.selectedTurfOption.value}),
      });
    } catch (e) {
      console.warn(e);
    }

    try {
      await fetch('https://'+this.props.server+'/canvass/v1/team/form/add', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({teamName: this.state.thisTeam, fId: this.state.selectedFormOption.value}),
      });
    } catch (e) {
      console.warn(e);
    }

    this.setState({saving: false});
  }

  _deleteTeam = async () => {
    try {
      await fetch('https://'+this.props.server+'/canvass/v1/team/delete', {
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

    await fetch('https://'+this.props.server+'/canvass/v1/team/create', {
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

    // also load canvassers & turf & forms
    let canvassers = await _loadCanvassers(this);
    let turf = await _loadTurf(this);
    let forms = await _loadForms(this);

    let memberOptions = [];
    let turfOptions = [];
    let formOptions = [];

    canvassers.forEach((c) => {
      if (!c.locked)
        memberOptions.push({value: c.name+c.email+c.location+(c.admin?"admin":""), id: c.id, label: (<CardCanvasser key={c.id} canvasser={c} refer={this} />)})
    });

    turf.forEach((t) => {
      turfOptions.push({value: t.name, label: (<CardTurf key={t.name} turf={t} />)})
    })

    forms.forEach((f) => {
      formOptions.push({value: f.id, label: (<CardForm key={f.id} form={f} />)})
    })

    this.setState({memberOptions, turfOptions, formOptions});
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
              Canvassers:
              <Select
                value={this.state.selectedMembersOption}
                onChange={this.handleMembersChange}
                options={this.state.memberOptions}
                isMulti={true}
                isSearchable={true}
                placeholder="Select team members to add"
              />
              <br />
              Turf:
              <Select
                value={this.state.selectedTurfOption}
                onChange={this.handleTurfChange}
                options={this.state.turfOptions}
                isSearchable={true}
                placeholder="Select turf for this team"
              />
              <br />
              Form:
              <Select
                value={this.state.selectedFormOption}
                onChange={this.handleFormChange}
                options={this.state.formOptions}
                isSearchable={true}
                placeholder="Select form for this team"
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
          props.refer.setState({thisTeam: props.team.name, selectedMembersOption: null, selectedTurfOption: null, selectedFormOption: null});

          let memberOptions = [];
          let turfOptions = {};
          let formOptions = {};

          try {
            let canvassers = await _loadCanvassers(props.refer, props.team.name);

            canvassers.forEach((c) => {
              memberOptions.push({value: c.name+c.email+c.location, id: c.id, label: (<CardCanvasser key={c.id} canvasser={c} refer={props.refer} />)})
            });
          } catch (e) {
            console.warn(e);
          }

          try {
            let turf = await _loadTurf(props.refer, props.team.name);

            turfOptions = {value: turf[0].name, label: (<CardTurf key={turf[0].name} turf={turf[0]} />)};
          } catch (e) {
            console.warn(e);
          }

          try {
            let form = await _loadForms(props.refer, props.team.name);

            formOptions = {value: form[0].id, label: (<CardForm key={form[0].id} form={form[0]} />)};
          } catch (e) {
            console.warn(e);
          }

          props.refer.setState({
            selectedMembersOption: memberOptions,
            selectedTurfOption: turfOptions,
            selectedFormOption: formOptions,
          });

        }}>edit</Link>)
      </div>
    </div>
  );
}
