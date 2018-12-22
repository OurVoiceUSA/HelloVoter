import React, { Component } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSync, faUser, faUsers, faCrown, faStreetView, faClipboard,
  faExclamationTriangle, faCheckCircle, faBan, faHome,
} from '@fortawesome/free-solid-svg-icons';

import GooglePlacesAutocomplete, {geocodeByAddress, getLatLng} from 'react-places-autocomplete';
import {NotificationManager} from 'react-notifications';
import LoaderSpinner from 'react-loader-spinner';
import Select from 'react-select';
import Img from 'react-image';
import { Link } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
TimeAgo.locale(en);

export const us_states = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AS": "American Samoa",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District Of Columbia",
    "FM": "Federated States Of Micronesia",
    "FL": "Florida",
    "GA": "Georgia",
    "GU": "Guam",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MH": "Marshall Islands",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "MP": "Northern Mariana Islands",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PW": "Palau",
    "PA": "Pennsylvania",
    "PR": "Puerto Rico",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VI": "Virgin Islands",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
};

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

  return fetch('https://'+server.hostname+uri, {
    method: method,
    headers: {
      'Authorization': 'Bearer '+server.jwt,
      'Content-Type': 'application/json',
    },
    body: (body?JSON.stringify(body):null),
  });
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

export class CardCanvasser extends Component {

  constructor(props) {
    super(props);

    this.state = {
      server: this.props.refer.props.server,
      canvasser: this.props.canvasser,
      selectedTeamsOption: null,
      selectedFormsOption: {},
      selectedTurfOption: {},
    };
  }

  componentDidMount() {
    if (!this.state.canvasser) this._loadData();
    ReactTooltip.rebuild();
  }

  componentDidUpdate() {
    ReactTooltip.rebuild();
  }

  handleTeamsChange = async (selectedTeamsOption) => {
    try {

      let prior = this.state.selectedTeamsOption.map((e) => {
        return e.value;
      });

      let now = selectedTeamsOption.map((e) => {
        return e.value;
      });

      // anything in "now" that isn't in "prior" gets added
      for (let ni in now) {
        let n = now[ni];
        if (prior.indexOf(n) === -1) {
          await _fetch(this.state.server, '/canvass/v1/team/members/add', 'POST', {teamName: n, cId: this.props.id});
        }
      };

      // anything in "prior" that isn't in "now" gets removed
      for (let pi in prior) {
        let p = prior[pi];
        if (now.indexOf(p) === -1) {
          await _fetch(this.state.server, '/canvass/v1/team/members/remove', 'POST', {teamName: p, cId: this.props.id});
        }
      };

      // refresh canvasser info
      let canvasser = await _loadCanvasser(this, this.props.id);
      notify_success("Team assignments saved.");
      this.setState({ selectedTeamsOption, selectedFormsOption: {}, selectedTurfOption: {}, canvasser });
    } catch (e) {

    }
  }

  handleFormsChange = async (selectedFormsOption) => {
    try {
      if (this.state.selectedFormsOption.value) {
        await _fetch(this.state.server, '/canvass/v1/form/assigned/canvasser/remove', 'POST', {
          fId: this.state.selectedFormsOption.value,
          cId: this.props.id,
        });
      }
      if (selectedFormsOption.value) {
        await _fetch(this.state.server, '/canvass/v1/form/assigned/canvasser/add', 'POST', {
          fId: selectedFormsOption.value,
          cId: this.props.id,
        });
      }
      // refresh canvasser info
      let canvasser = await _loadCanvasser(this, this.props.id);
      notify_success("Form selection saved.");
      this.setState({canvasser, selectedFormsOption});
    } catch (e) {
      notify_error(e, "Unable to add/remove form.");
    }
  }

  handleTurfChange = async (selectedTurfOption) => {
    try {
      if (this.state.selectedTurfOption.value) {
        await _fetch(this.state.server, '/canvass/v1/turf/assigned/canvasser/remove', 'POST', {
          turfName: this.state.selectedTurfOption.value,
          cId: this.props.id,
        });
      }
      if (selectedTurfOption.value) {
        await _fetch(this.state.server, '/canvass/v1/turf/assigned/canvasser/add', 'POST', {
          turfName: selectedTurfOption.value,
          cId: this.props.id,
        });
      }
      // refresh canvasser info
      let canvasser = await _loadCanvasser(this, this.props.id);
      notify_success("Turf selection saved.");
      this.setState({canvasser, selectedTurfOption});
    } catch (e) {
      notify_error(e, "Unable to add/remove turf.");
    }
  }

  _loadData = async () => {
    let canvasser = {};

    this.setState({loading: true})

    try {
       canvasser = await _loadCanvasser(this, this.props.id);
    } catch (e) {
      notify_error(e, "Unable to load canavasser info.");
      return;
    }

    let forms = await _loadForms(this.props.refer);
    let turf = await _loadTurf(this.props.refer);
    let teams = await _loadTeams(this.props.refer);

    let teamOptions = [];
    let selectedTeamsOption = [];
    let selectedFormsOption = {};
    let selectedTurfOption = {};

    let formOptions = [
      {value: '', label: "None"},
    ];

    let turfOptions = [
      {value: '', label: "None"},
      {value: 'auto', label: (<CardTurf key="auto" turf={{name: "Area surrounnding this canvasser's home address"}} icon={faHome} />)},
    ];

    teams.forEach((t) => {
      teamOptions.push({value: t.name, label: (
        <CardTeam key={t.name} t={t} />
      )});
      canvasser.ass.teams.forEach((a) => {
        if (a.name === t.name) {
          selectedTeamsOption.push({value: t.name, label: (
            <CardTeam key={t.name} t={t} />
          )});
        }
      });
    });

    forms.forEach((f) => {
      formOptions.push({value: f.id, label: (<CardForm key={f.id} form={f} />)});
    });

    if (canvasser.ass.forms.length) {
      let f = canvasser.ass.forms[0];
      selectedFormsOption = {value: f.id, label: (<CardForm key={f.id} form={f} />)};
    }

    turf.forEach((t) => {
      turfOptions.push({value: t.name, label: (<CardTurf key={t.id} turf={t} />)})
    });

    if (canvasser.ass.turf.length) {
      let t = canvasser.ass.turf[0];
      selectedTurfOption = {value: t.name, label: (<CardTurf key={t.id} turf={t} icon={(canvasser.autoturf?faHome:null)} />)};
    }

    this.setState({canvasser, teamOptions, formOptions, turfOptions, selectedTeamsOption, selectedFormsOption, selectedTurfOption, loading: false});
  }

  _lockCanvasser = async (canvasser, flag) => {
    let term = (flag?'lock':'unlock');
    try {
      await _fetch(this.state.server, '/canvass/v1/canvasser/'+term, 'POST', {id: canvasser.id});
    } catch (e) {
      notify_error(e, "Unable to "+term+" canvasser.");
    }
    this._loadData();
    notify_success("Canvasser hass been "+term+"ed.");
  }

  render() {
    const { canvasser } = this.state;

    if (!canvasser || this.state.loading) {
      return (<Loader />);
    }

    const timeAgo = new TimeAgo('en-US');
    return (
      <div>
        <div style={{display: 'flex', padding: '10px'}}>
          <div style={{padding: '5px 10px'}}>
            <Img width={50} src={this.state.canvasser.avatar} loader={<Loader width={50} />} unloader={<Icon style={{width: 50, height: 50, color: "gray"}} icon={faUser} />} />
          </div>
          <div style={{flex: 1, overflow: 'auto'}}>
            Name: {canvasser.name} {(this.props.edit?'':(<Link to={'/canvassers/view/'+canvasser.id}>view profile</Link>))}
            <CanvasserBadges canvasser={canvasser} />
            <br />
            Location: {(canvasser.homeaddress?extract_addr(canvasser.homeaddress):'N/A')} <br />
            Last Login: {timeAgo.format(new Date(canvasser.last_seen-30000))}
          </div>
        </div>
        {this.props.edit?<CardCanvasserFull canvasser={canvasser} refer={this} />:''}
      </div>
    );
  }
}

export const CardTeam = (props) => (
  <div style={{display: 'flex', padding: '10px'}}>
    <div style={{padding: '5px 10px'}}>
      <Icon style={{width: 50, height: 50, color: "gray"}} icon={faUsers} />
    </div>
    <div style={{flex: 1, overflow: 'auto'}}>
      {props.t.name}
    </div>
  </div>
);

export const CardCanvasserFull = (props) => (
  <div>
    <br />
    {props.canvasser.locked?
      (<button onClick={() => props.refer._lockCanvasser(props.canvasser, false)}>Restore Access</button>)
    :
      (<button onClick={() => props.refer._lockCanvasser(props.canvasser, true)}>Deny Access</button>)
    }
    <br />
    Email: {(props.canvasser.email?props.canvasser.email:'N/A')}
    <br />
    Phone: {(props.canvasser.phone?props.canvasser.phone:'N/A')}
    <br />
    Address: <CanvasserAddress refer={props.refer} canvasser={props.canvasser} />
    <br />
    # of doors knocked: 0
    <br />
    <br />
    {props.canvasser.ass.direct?
    <div>
      This canvasser is not assigned to any teams. To do so, you must remove the direct form and turf assignments below.
    </div>
    :
    <div>
      Teams this canvasser is a part of:
      <Select
        value={props.refer.state.selectedTeamsOption}
        onChange={props.refer.handleTeamsChange}
        options={props.refer.state.teamOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
    }
    <br />
    {props.refer.state.selectedTeamsOption.length?
    <div>
      Forms / Turf this users sees based on the above team(s):
      <br />
      {props.canvasser.ass.forms.map((f) => (<CardForm key={f.name} form={f} />))}
      {props.canvasser.ass.turf.map((t) => (<CardTurf key={t.name} turf={t} />))}
    </div>
    :
    <div>
      Forms this canvasser is directly assigned to:
      <Select
        value={props.refer.state.selectedFormsOption}
        onChange={props.refer.handleFormsChange}
        options={props.refer.state.formOptions}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Turf this canvasser is directly assigned to:
      <Select
        value={props.refer.state.selectedTurfOption}
        onChange={props.refer.handleTurfChange}
        options={props.refer.state.turfOptions}
        isSearchable={true}
        placeholder="None"
      />
    </div>
    }

  </div>
)

export class CanvasserAddress extends Component {

  constructor(props) {
    super(props);
    this.state = {
      edit: false,
      address: (this.props.canvasser.homeaddress?this.props.canvasser.homeaddress:""),
    };
    this.onTypeAddress = (address) => this.setState({ address });
  }

  submitAddress = async (address) => {
    this.setState({address})
    try {
      let res = await geocodeByAddress(address);
      let pos = await getLatLng(res[0]);
      await _fetch(this.props.refer.state.server, '/canvass/v1/canvasser/update', 'POST', {
        id: this.props.canvasser.id,
        address: address,
        lat: pos.lat,
        lng: pos.lng,
      });
      this.props.refer._loadData();
      notify_success("Address hass been saved.");
    } catch (e) {
      notify_error(e, "Unable to update address info.");
    }
  }

  render() {
    if (this.state.edit) return (
      <PlacesAutocomplete
        debounce={500}
        value={this.state.address}
        onChange={this.onTypeAddress}
        onSelect={this.submitAddress}
      />
    );

    return (
      <div>
        {this.state.address} <button onClick={() => this.setState({edit: true})}>click to edit</button>
      </div>
    );
  }
}

export const CanvasserBadges = (props) => {
  let badges = [];
  let id = props.canvasser.id;

  if (props.canvasser.admin) badges.push(<Icon icon={faCrown} color="gold" key={id+"admin"} data-tip="Administrator" />);
  if (props.canvasser.locked) badges.push(<Icon icon={faBan} color="red" key={id+"locked"} data-tip="Denied access" />);
  else {
    if (props.canvasser.ass.ready) badges.push(<Icon icon={faCheckCircle} color="green" key={id+"ready"} data-tip="Ready to Canvass" />);
    else badges.push(<Icon icon={faExclamationTriangle} color="red" key={id+"notready"} data-tip="Not ready to canvass, check assignments" />);
  }

  return badges;
}

export async function _loadCanvassers(refer, teamName) {
  let canvassers = [];

  try {
    let call = 'canvasser/list';
    if (teamName) call = 'team/members/list?teamName='+teamName;

    let res = await _fetch(refer.props.server, '/canvass/v1/'+call);
    canvassers = await res.json();
  } catch (e) {
    notify_error(e, "Unable to load canvasser data.");
  }

  return canvassers;
}

export const CardTurf = (props) => (
  <div style={{display: 'flex', padding: '10px'}}>
    <div style={{padding: '5px 10px'}}>
      <Icon style={{width: 50, height: 50, color: "gray"}} icon={(props.icon?props.icon:faStreetView)} />
    </div>
    <div style={{flex: 1, overflow: 'auto'}}>
      {props.turf.name}
    </div>
  </div>
)

export async function _loadTurf(refer, teamName) {
  let turf = [];

  try {
    let call = 'turf/list';
    if (teamName) call = 'team/turf/list?teamName='+teamName;
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

export async function _loadTeams(refer) {
  let teams = [];

  try {
    let res = await _fetch(refer.props.server, '/canvass/v1/team/list');
    teams = await res.json();
  } catch (e) {
    notify_error(e, "Unable to load team data.");
  }

  return teams.data;
}

export async function _loadForms(refer, teamName) {
  let forms = [];

  try {
    let uri;

    if (teamName) uri = 'team/form/list?teamName='+teamName;
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

export function extract_addr(addr) {
  let arr = addr.split(', ');
  arr.shift();
  return arr.join(', ');
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
