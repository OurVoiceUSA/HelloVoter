import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

import GooglePlacesAutocomplete from 'react-places-autocomplete';
import { NotificationManager } from 'react-notifications';
import formatNumber from 'simple-format-number';
import prettyMs from 'pretty-ms';

import Modal from '@material-ui/core/Modal';
import CircularProgress from '@material-ui/core/CircularProgress';

export const API_BASE_URI = '/HelloVoterHQ/api/v1';

export function jobRuntime(start, end) {
  if (end)
    return prettyMs(end-start);
  else
    return '';
}

export function jobNumber(num) {
  if (num) return formatNumber(num, { fractionDigits: 0 });
  else return '';
}

export function notify_success(msg) {
  NotificationManager.success(msg, 'Success', 3000);
}

export function notify_error(e, msg) {
  if (e && e.mock) msg = e.message;
  NotificationManager.error(msg, 'Error', 6000);
  console.warn(e);
}

export async function _fetch(server, uri, method, body) {
  if (!server) return;

  let https = true;
  if (server.hostname.match(/^localhost/)) https = false;

  if (!method) method = 'GET';

  if (!server.hostname) {
    notify_error({}, 'API server definition error.');
    return;
  }

  let res = await fetch('http'+(https?'s':'')+'://' + server.hostname + uri, {
    method: method,
    headers: {
      Authorization: 'Bearer ' + server.jwt,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });

  if (res.status >= 400) throw new Error(await res.text());

  return res.json();
}

export function _browserLocation(props) {
  if (!props.isGeolocationAvailable || !props.isGeolocationEnabled)
    return { access: false };
  if (props.coords)
    return {
      access: true,
      lng: props.coords.longitude,
      lat: props.coords.latitude
    };
  return { access: true };
}

export const Icon = props => (
  <FontAwesomeIcon
    style={{ width: 25 }}
    data-tip={props['data-tip'] ? props['data-tip'] : props.icon.iconName}
    {...props}
  />
);

export const RootLoader = props => {
  if (props.flag) return <CircularProgress />;
  else
    return (
      <div>
        <Icon
          icon={faSync}
          color="green"
          onClick={props.func}
          data-tip="Reload Data"
        />
        <div>{props.children}</div>
      </div>
    );
};

export const DialogSaving = props => {
  if (props.flag)
    return (
      <Modal
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
        open={true}
      >
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: '40%',
            right: '40%',
            backgroundColor: 'white',
            padding: 40
          }}
        >
          <center>
            Saving changes...
            <br />
            <br />
            <CircularProgress disableShrink />
          </center>
        </div>
      </Modal>
    );
  return <div />;
};

export function _searchStringify(obj) {
  // deep copy and remove volitile variables
  let o = JSON.parse(JSON.stringify(obj));
  delete o.last_seen;
  delete o.created;
  delete o.id;
  return JSON.stringify(o).toLowerCase();
}

export async function _loadImports(refer) {
  let imports = [];
  try {
    let data = await _fetch(refer.state.server, API_BASE_URI+'/import/list');
    imports = data && data.data ? data.data : [];
  } catch (e) {
    notify_error(e, 'Unable to load import info.');
  }
  return imports;
}

export async function _loadVolunteer(refer, id) {
  let volunteer = {};
  try {
    volunteer = await _fetch(
      refer.state.server,
      API_BASE_URI+'/volunteer/get?id=' + id
    );
  } catch (e) {
    notify_error(e, 'Unable to load volunteer info.');
  }
  return volunteer;
}

export async function _loadVolunteers(refer, byType, id) {
  let volunteers = [];

  try {
    let call = 'volunteer/list';

    if (byType === 'team') call = 'team/members/list?teamId=' + id;
    else if (byType === 'turf')
      call = 'turf/assigned/volunteer/list?turfId=' + id;
    else if (byType === 'form')
      call = 'form/assigned/volunteer/list?formId=' + id;

    volunteers = await _fetch(refer.props.server, API_BASE_URI+'/' + call);
  } catch (e) {
    notify_error(e, 'Unable to load volunteer data.');
  }

  return volunteers;
}

export async function _loadTurf(refer, id) {
  let turf = {};

  try {
    turf = await _fetch(
      refer.state.server,
      API_BASE_URI+'/turf/get?turfId=' + id
    );
  } catch (e) {
    notify_error(e, 'Unable to load turf data.');
  }

  return turf.data[0];
}

export async function _loadTurfs(refer, teamId, flag) {
  let turf = [];

  try {
    let call = 'turf/list' + (flag ? '?geometry=true' : '');
    if (teamId)
      call = 'team/turf/list?teamId=' + teamId + (flag ? '&geometry=true' : '');
    let data = await _fetch(refer.props.server, API_BASE_URI+'/' + call);
    turf = data.data ? data.data : [];
  } catch (e) {
    notify_error(e, 'Unable to load turf data.');
  }

  return turf;
}

export async function _loadNearbyTurfs(refer, lng, lat, dist) {
  let turf = [];

  try {
    let data = await _fetch(refer.props.server, API_BASE_URI+'/turf/list/byposition?longitude='+lng+'&latitude='+lat+(dist?'&dist='+dist:''));
    turf = data.data ? data.data : [];
  } catch (e) {
    notify_error(e, 'Unable to load turf data.');
  }

  return turf;
}

export async function _loadTeam(refer, id) {
  let team = {};

  try {
    team = await _fetch(
      refer.state.server,
      API_BASE_URI+'/team/get?teamId=' + id
    );
  } catch (e) {
    notify_error(e, 'Unable to load team data.');
  }

  return team.data[0];
}

export async function _loadTeams(refer, byType, id) {
  let teams = [];

  try {
    let call = 'team/list';

    if (byType === 'turf') call = 'turf/assigned/team/list?turfId=' + id;
    else if (byType === 'form') call = 'form/assigned/team/list?formId=' + id;

    let data = await _fetch(refer.props.server, API_BASE_URI+'/' + call);
    teams = data.data ? data.data : [];
  } catch (e) {
    notify_error(e, 'Unable to load teams data.');
  }

  return teams;
}

export async function _loadForm(refer, id) {
  let form = {};

  try {
    form = await _fetch(
      refer.state.server,
      API_BASE_URI+'/form/get?formId=' + id
    );
  } catch (e) {
    notify_error(e, 'Unable to load form data.');
  }

  return form;
}

export async function _loadForms(refer, teamId) {
  let forms = [];

  try {
    let uri;

    if (teamId) uri = 'team/form/list?teamId=' + teamId;
    else uri = 'form/list';

    let data = await _fetch(refer.props.server, API_BASE_URI+'/' + uri);
    forms = data.data ? data.data : [];
  } catch (e) {
    notify_error(e, 'Unable to load form data.');
  }

  return forms;
}

export async function _loadAttributes(refer) {
  let forms = [];

  try {
    let data = await _fetch(refer.props.server, API_BASE_URI+'/attribute/list');
    forms = data.data ? data.data : [];
  } catch (e) {
    notify_error(e, 'Unable to load attribute data.');
  }

  return forms;
}

export async function _loadAddressData(refer, lng, lat, formId) {
  let data = [];
  try {
    data = await _fetch(refer.props.server, API_BASE_URI+'/address/get/byposition?limit=1000&longitude='+lng+'&latitude='+lat+(formId?'&formId='+formId:''));
  } catch (e) {
    notify_error(e, 'Unable to load address information.');
  }
  return data;
}

export async function _loadPeopleAddressData(refer, aId, formId) {
  let data = [];
  try {
    data = await _fetch(refer.props.server, API_BASE_URI+'/people/get/byaddress?aId='+aId+(formId?'&formId='+formId:''));
  } catch (e) {
    notify_error(e, 'Unable to load address information.');
  }
  return data;
}

export function _handleSelectChange(oldopt, newopt) {
  let add = [];
  let rm = [];

  if (!oldopt) oldopt = [];
  if (!newopt) newopt = [];

  let prior = oldopt.map(e => {
    return e.id;
  });

  let now = newopt.map(e => {
    return e.id;
  });

  // anything in "now" that isn't in "prior" gets added
  for (let ni in now) {
    let n = now[ni];
    if (prior.indexOf(n) === -1) {
      add.push(n);
    }
  }

  // anything in "prior" that isn't in "now" gets removed
  for (let pi in prior) {
    let p = prior[pi];
    if (now.indexOf(p) === -1) {
      rm.push(p);
    }
  }

  return { add: add, rm: rm };
}

export const PlacesAutocomplete = props => (
  <GooglePlacesAutocomplete {...props}>
    {addressSearch}
  </GooglePlacesAutocomplete>
);

const addressSearch = ({
  getInputProps,
  getSuggestionItemProps,
  suggestions,
  loading
}) => (
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
