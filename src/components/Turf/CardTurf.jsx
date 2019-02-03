import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import CircularProgress from '@material-ui/core/CircularProgress';

import { faStreetView } from '@fortawesome/free-solid-svg-icons';

import { CardVolunteer } from '../Volunteers';
import { CardTeam } from '../Teams';
import { CardTurfFull } from './CardTurfFull';

import {
  API_BASE_URI,
  _fetch,
  notify_error,
  notify_success,
  _handleSelectChange,
  _searchStringify,
  _loadTurf,
  _loadTeams,
  _loadVolunteers,
  Icon,
} from '../../common.js';

export class CardTurf extends Component {
  constructor(props) {
    super(props);

    this.state = {
      server: this.props.refer.props.server,
      turf: this.props.turf,
      selectedTeamsOption: [],
      selectedMembersOption: []
    };
  }

  componentDidMount() {
    if (!this.state.turf) this._loadData();
  }

  handleTeamsChange = async selectedTeamsOption => {
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedTeamsOption,
        selectedTeamsOption
      );

      for (let i in obj.add) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/turf/assigned/team/add',
          'POST',
          { teamId: obj.add[i], turfId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/turf/assigned/team/remove',
          'POST',
          { teamId: obj.rm[i], turfId: this.props.id }
        );
      }

      notify_success('Team assignments saved.');
      this.setState({ selectedTeamsOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleMembersChange = async selectedMembersOption => {
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedMembersOption,
        selectedMembersOption
      );

      for (let i in obj.add) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/turf/assigned/volunteer/add',
          'POST',
          { cId: obj.add[i], turfId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/turf/assigned/volunteer/remove',
          'POST',
          { cId: obj.rm[i], turfId: this.props.id }
        );
      }

      notify_success('Volunteer assignments saved.');
      this.setState({ selectedMembersOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  _loadData = async () => {
    let turf = {},
      volunteers = [],
      members = [],
      teams = [],
      teamsSelected = [];

    this.setState({ loading: true });

    try {
      [turf, volunteers, members, teams, teamsSelected] = await Promise.all([
        _loadTurf(this, this.props.id, true),
        _loadVolunteers(this.props.refer),
        _loadVolunteers(this.props.refer, 'turf', this.props.id),
        _loadTeams(this.props.refer),
        _loadTeams(this.props.refer, 'turf', this.props.id)
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load turf info.');
      return this.setState({ loading: false });
    }

    let teamOptions = [];
    let membersOption = [];
    let selectedTeamsOption = [];
    let selectedMembersOption = [];

    teams.forEach(t => {
      teamOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam key={t.id} team={t} refer={this} />
      });
    });

    teamsSelected.forEach(t => {
      selectedTeamsOption.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam key={t.id} team={t} refer={this} />
      });
    });

    volunteers.forEach(c => {
      membersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer key={c.id} volunteer={c} refer={this} />
      });
    });

    members.forEach(c => {
      selectedMembersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer key={c.id} volunteer={c} refer={this} />
      });
    });

    this.setState({
      turf,
      volunteers,
      teamOptions,
      membersOption,
      selectedTeamsOption,
      selectedMembersOption,
      loading: false
    });
  };

  render() {
    const { turf } = this.state;

    if (!turf || this.state.loading) {
      return <CircularProgress />;
    }

    return (
      <div>
        <div style={{ display: 'flex', padding: '10px' }}>
          <div style={{ padding: '5px 10px' }}>
            <Icon
              icon={faStreetView}
              style={{ width: 50, height: 50, color: 'gray' }}
            />{' '}
            {turf.name}{' '}
            {this.props.edit ? (
              ''
            ) : (
              <Link to={'/turf/view/' + turf.id}>view</Link>
            )}
          </div>
        </div>
        {this.props.edit ? <CardTurfFull turf={turf} refer={this} /> : ''}
      </div>
    );
  }
}
