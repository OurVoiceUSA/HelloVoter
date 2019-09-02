import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import CircularProgress from '@material-ui/core/CircularProgress';

import { faStreetView } from '@fortawesome/free-solid-svg-icons';

import { CardVolunteer } from '../Volunteers';
import { CardTeam } from '../Teams';
import { CardTurfFull } from './CardTurfFull';

import {
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
      global: props.global,
      turf: this.props.turf,
      selectedTeamsOption: [],
      selectedMembersOption: []
    };
  }

  componentDidMount() {
    if (!this.state.turf) this._loadData();
  }

  handleTeamsChange = async selectedTeamsOption => {
    const { global } = this.state;

    if (!selectedTeamsOption) selectedTeamsOption = [];
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedTeamsOption,
        selectedTeamsOption
      );

      let adrm = [];

      obj.add.forEach(add => {
        adrm.push(_fetch(
          global,
          '/turf/assigned/team/add',
          'POST',
          { teamId: add, turfId: this.props.id }
        ));
      });

      obj.rm.forEach(rm => {
        adrm.push(_fetch(
          global,
          '/turf/assigned/team/remove',
          'POST',
          { teamId: rm, turfId: this.props.id }
        ));
      });

      await Promise.all(adrm);

      notify_success('Team assignments saved.');
      this.setState({ selectedTeamsOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleMembersChange = async selectedMembersOption => {
    const { global } = this.state;

    if (!selectedMembersOption) selectedMembersOption = [];
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedMembersOption,
        selectedMembersOption
      );

      let adrm = [];

      obj.add.forEach(add => {
        adrm.push(_fetch(
          global,
          '/turf/assigned/volunteer/add',
          'POST',
          { vId: add, turfId: this.props.id }
        ));
      });

      obj.rm.forEach(rm => {
        adrm.push(_fetch(
          global,
          '/turf/assigned/volunteer/remove',
          'POST',
          { vId: rm, turfId: this.props.id }
        ));
      });

      await Promise.all(adrm);

      notify_success('Volunteer assignments saved.');
      this.setState({ selectedMembersOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  _loadData = async () => {
    const { global } = this.state;

    let turf = {},
      volunteers = [],
      members = [],
      teams = [],
      teamsSelected = [];

    this.setState({ loading: true });

    try {
      [turf, volunteers, members, teams, teamsSelected] = await Promise.all([
        _loadTurf(global, this.props.id, true),
        _loadVolunteers(global),
        _loadVolunteers(global, 'turf', this.props.id),
        _loadTeams(global),
        _loadTeams(global, 'turf', this.props.id)
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
        label: <CardTeam global={global} key={t.id} team={t} refer={this} />
      });
    });

    teamsSelected.forEach(t => {
      selectedTeamsOption.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam global={global} key={t.id} team={t} refer={this} />
      });
    });

    volunteers.forEach(c => {
      membersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer global={global} key={c.id} volunteer={c} refer={this} />
      });
    });

    members.forEach(c => {
      selectedMembersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer global={global} key={c.id} volunteer={c} refer={this} />
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
              style={{ width: 20, height: 20, color: 'gray' }}
            />{' '}
            {turf.name}{' '}
            {this.props.edit ? (
              ''
            ) : (
              <Link to={'/turf/view/' + turf.id}>view</Link>
            )}
          </div>
        </div>
        {this.props.edit ? <CardTurfFull global={global} turf={turf} refer={this} /> : ''}
      </div>
    );
  }
}
