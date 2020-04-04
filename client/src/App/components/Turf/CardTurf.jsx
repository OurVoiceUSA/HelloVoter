import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import CircularProgress from '@material-ui/core/CircularProgress';

import { faStreetView } from '@fortawesome/free-solid-svg-icons';

import { CardVolunteer } from '../Volunteers';
import { CardTurfFull } from './CardTurfFull';

import {
  _fetch,
  notify_error,
  notify_success,
  _handleSelectChange,
  _searchStringify,
  _loadTurf,
  _loadVolunteers,
  Icon,
} from '../../common.js';

export class CardTurf extends Component {
  constructor(props) {
    super(props);

    this.state = {
      global: props.global,
      turf: this.props.turf,
      selectedMembersOption: []
    };
  }

  componentDidMount() {
    if (!this.state.turf) this._loadData();
  }

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
      notify_error(e, 'Unable to add/remove volunteers.');
    }
    this.props.refer.setState({ saving: false });
  };

  _loadData = async () => {
    const { global } = this.state;

    let turf = {},
      volunteers = [],
      members = [];

    this.setState({ loading: true });

    try {
      [turf, volunteers, members] = await Promise.all([
        _loadTurf(global, this.props.id, true),
        _loadVolunteers(global),
        _loadVolunteers(global, 'turf', this.props.id)
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load turf info.');
      return this.setState({ loading: false });
    }

    let membersOption = [];
    let selectedMembersOption = [];

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
      membersOption,
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
