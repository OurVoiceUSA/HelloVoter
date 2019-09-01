import React, { Component } from 'react';

import { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import Select from 'react-select';

import Button from '@material-ui/core/Button';

import {
  notify_error,
  notify_success,
  _fetch,
  PlacesAutocomplete,
} from '../../common.js';

import { CardTurf } from '../Turf';
import { CardForm } from '../Forms';

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
TimeAgo.locale(en);

const NEARBY_DIST = 50;

export const CardVolunteerFull = props => (
  <div>
    <br />
    {props.volunteer.locked ? (
      <Button
        onClick={() => props.refer._lockVolunteer(props.volunteer, false)}
      >
        Restore Access
      </Button>
    ) : (
      <Button onClick={() => props.refer._lockVolunteer(props.volunteer, true)}>
        Deny Access
      </Button>
    )}
    <br />
    Last Seen:{' '}
    {new TimeAgo('en-US').format(new Date(props.volunteer.last_seen - 30000))}
    <br />
    Email: {props.volunteer.email ? props.volunteer.email : 'N/A'}
    <br />
    Phone: {props.volunteer.phone ? props.volunteer.phone : 'N/A'}
    <br />
    Address:{' '}
    <VolunteerAddress global={global} refer={props.refer} volunteer={props.volunteer} />
    <br />
    {props.refer.state.hometurf.length?
      <div>
        Turf this volunteer's home address is in:
        {props.refer.state.hometurf.map(t => <div>{t.name}</div>)}
      </div>
      :
      <div>This volunteer's home address isn't in any turf.</div>
    }
    <br />
    {props.refer.state.nearbyturf.length?
      <div>
        Turf this volunteer's home address is near by:
        {props.refer.state.nearbyturf.slice(0,5).map(t => <div>{t.name}</div>)}
      </div>
      :
      <div>No turfs are within {NEARBY_DIST}km of this volunteer.</div>
    }
    <br />
    # of doors knocked: N/A
    <br />
    <br />
    <div>
      Teams this volunteer is a member of:
      <Select
        value={props.refer.state.selectedTeamsOption}
        onChange={props.refer.handleTeamsChange}
        options={props.refer.state.teamOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Teams this volunteer is a leader of:
      <Select
        value={props.refer.state.selectedLeaderOption}
        onChange={props.refer.handleLeaderChange}
        options={props.refer.state.selectedTeamsOption}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>

    <br />
    {props.refer.state.selectedTeamsOption.length ? (
      <div>
        Forms / Turf this users sees based on the above team(s):
        <br />
        {props.volunteer.ass.forms.filter(f => !f.direct).map(f => (
          <CardForm global={global} key={f.id} form={f} refer={props.refer} />
        ))}
        {props.volunteer.ass.turfs.filter(t => !t.direct).map(t => (
          <CardTurf global={global} key={t.id} turf={t} refer={props.refer} />
        ))}
      </div>
    ):''
    }
    <div>
      Forms this volunteer is directly assigned to:
      <Select
        value={props.refer.state.selectedFormsOption}
        onChange={props.refer.handleFormsChange}
        options={props.refer.state.formOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Turf this volunteer is directly assigned to:
      <Select
        value={props.refer.state.selectedTurfOption}
        onChange={props.refer.handleTurfChange}
        options={props.refer.state.turfOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
  </div>
);

export class VolunteerAddress extends Component {
  constructor(props) {
    super(props);
    this.state = {
      global: props.global,
      edit: false,
      address: this.props.volunteer.locationstr
        ? this.props.volunteer.locationstr
        : ''
    };
    this.onTypeAddress = address => this.setState({ address });
  }

  submitAddress = async address => {
    const { global } = this.state;

    this.setState({ address });
    try {
      let res = await geocodeByAddress(address);
      let pos = await getLatLng(res[0]);
      await _fetch(
        global,
        '/volunteer/update',
        'POST',
        {
          id: this.props.volunteer.id,
          address: address,
          lat: pos.lat,
          lng: pos.lng
        }
      );
      this.props.refer._loadData();
      notify_success('Address hass been saved.');
    } catch (e) {
      notify_error(e, 'Unable to update address info.');
    }
  };

  render() {
    if (this.state.edit)
      return (
        <PlacesAutocomplete
          debounce={500}
          value={this.state.address}
          onChange={this.onTypeAddress}
          onSelect={this.submitAddress}
        />
      );

    return (
      <div>
        {this.state.address}{' '}
        <Button onClick={() => this.setState({ edit: true })}>
          click to edit
        </Button>
      </div>
    );
  }
}
