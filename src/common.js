import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faClipboard } from '@fortawesome/free-solid-svg-icons';

import GooglePlacesAutocomplete from 'react-places-autocomplete';
import {NotificationManager} from 'react-notifications';
import LoaderSpinner from 'react-loader-spinner';

export function notify_success(msg) {
  NotificationManager.success(msg, 'Success', 3000);
}

export function notify_error(e, msg) {
  NotificationManager.error(msg, 'Error', 6000);
  console.warn(e);
}

export async function _fetch(server, uri, method, body) {
  if (!method) method = 'GET';

  if (!server.hostname) {
    notify_error({}, "API server definition error.");
    return;
  }

  let res = await fetch('https://'+server.hostname+uri, {
    method: method,
    headers: {
      'Authorization': 'Bearer '+server.jwt,
      'Content-Type': 'application/json',
    },
    body: (body?JSON.stringify(body):null),
  });

  if (res.status >= 400) throw new Error(await res.text());

  return res;
}

export function _browserLocation(props) {
  if (!props.isGeolocationAvailable || !props.isGeolocationEnabled) return {access: false};
  if (props.coords) return {access: true, lng: props.coords.longitude, lat: props.coords.latitude};
  return {access: true};
}

export const Icon = (props) => (
  <FontAwesomeIcon style={{width: 25}} data-tip={(props['data-tip']?props['data-tip']:props.icon.iconName)} {...props} />
)

export const Loader = (props) => (
  <LoaderSpinner type="ThreeDots" {...props} />
)

export const RootLoader = (props) => {
  if (props.flag) return (<Loader />);
  else return (
    <div>
      <Icon icon={faSync} color="green" onClick={props.func} data-tip="Reload Data" />
      <div>{props.children}</div>
    </div>
  );
}

export function _searchStringCanvasser(c) {
    return (c.id+c.name+c.email+c.homeaddress+(c.admin?"admin":"")).toLowerCase();
}

export async function _loadCanvasser(refer, id) {
  let canvasser = {};
  try {
    let res = await _fetch(refer.state.server, '/canvass/v1/canvasser/get?id='+id);
    canvasser = await res.json();
  } catch (e) {
    notify_error(e, "Unable to load canvasser info.");
  }
  return canvasser;
}

export async function _loadCanvassers(refer, byType, id) {
  let canvassers = [];

  try {
    let call = 'canvasser/list';

    if (byType === 'team') call = 'team/members/list?teamId='+id;
    else if (byType === 'turf') call = 'turf/assigned/canvasser/list?turfId='+id;

    let res = await _fetch(refer.props.server, '/canvass/v1/'+call);
    canvassers = await res.json();
  } catch (e) {
    notify_error(e, "Unable to load canvasser data.");
  }

  return canvassers;
}

export async function _loadTurf(refer, id) {
  let turf = {};

  try {
    let res = await _fetch(refer.state.server, '/canvass/v1/turf/get?turfId='+id);
    turf = await res.json();
  } catch (e) {
    notify_error(e, "Unable to load turf data.");
  }

  return turf.data[0];
}

export async function _loadTurfs(refer, teamId, flag) {
  let turf = [];

  try {
    let call = 'turf/list'+(flag?'?geometry=true':'');
    if (teamId) call = 'team/turf/list?teamId='+teamId+(flag?'&geometry=true':'');
    let res = await _fetch(refer.props.server, '/canvass/v1/'+call);
    let data = await res.json();
    turf = (data.data?data.data:[]);
  } catch (e) {
    notify_error(e, "Unable to load turf data.");
  }

  return turf;
}

export const CardForm = (props) => (
  <div style={{display: 'flex', padding: '10px'}}>
    <div style={{padding: '5px 10px'}}>
      <Icon style={{width: 50, height: 50, color: "gray"}} icon={faClipboard} />
    </div>
    <div style={{flex: 1, overflow: 'auto'}}>
      {props.form.name}
    </div>
  </div>
)

export async function _loadTeam(refer, id) {
  let team = {};

  try {
    let res = await _fetch(refer.state.server, '/canvass/v1/team/get?teamId='+id);
    team = await res.json();
  } catch (e) {
    notify_error(e, "Unable to load team data.");
  }

  return team.data[0];
}

export async function _loadTeams(refer, turfId) {
  let teams = [];

  try {
    let call = 'team/list';
    if (turfId) call = 'turf/assigned/team/list?turfId='+turfId;
    let res = await _fetch(refer.props.server, '/canvass/v1/'+call);
    teams = await res.json();
  } catch (e) {
    notify_error(e, "Unable to load teams data.");
  }

  return teams.data;
}

export async function _loadForms(refer, teamId) {
  let forms = [];

  try {
    let uri;

    if (teamId) uri = 'team/form/list?teamId='+teamId;
    else uri = 'form/list';

    let res = await _fetch(refer.props.server, '/canvass/v1/'+uri);
    let data = await res.json();
    forms = (data.data?data.data:[]);
  } catch (e) {
    notify_error(e, "Unable to load form data.");
  }

  return forms;
}

export async function _loadAddresses(refer) {
  let addresses = {};
  try {
    let res = await _fetch(refer.props.server, '/canvass/v1/sync', 'POST', {nodes: {}});
    addresses = await res.json();
  } catch (e) {
    notify_error(e, "Unable to load address information.");
  }
  return addresses;
}

export function _handleSelectChange(oldopt, newopt) {
  let add = [];
  let rm = [];

  let prior = oldopt.map((e) => {
    return e.id;
  });

  let now = newopt.map((e) => {
    return e.id;
  });

  // anything in "now" that isn't in "prior" gets added
  for (let ni in now) {
    let n = now[ni];
    if (prior.indexOf(n) === -1) {
      add.push(n);
    }
  };

  // anything in "prior" that isn't in "now" gets removed
  for (let pi in prior) {
    let p = prior[pi];
    if (now.indexOf(p) === -1) {
      rm.push(p);
    }
  };

  return {add: add, rm: rm};
}

export const PlacesAutocomplete = (props) => (
  <GooglePlacesAutocomplete {...props}>
    {addressSearch}
  </GooglePlacesAutocomplete>
)

const addressSearch = ({ getInputProps, getSuggestionItemProps, suggestions, loading }) => (
  <div className="autocomplete-root">
    <input {...getInputProps()} />
    <div className="autocomplete-dropdown-container">
      {loading && <div>Loading...</div>}
      {suggestions.map(suggestion => (
        <div {...getSuggestionItemProps(suggestion)}>
          <span>{suggestion.description}</span>
        </div>
      ))}
    </div>
  </div>
);
