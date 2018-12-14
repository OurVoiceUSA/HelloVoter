import React from 'react';
import LoaderSpinner from 'react-loader-spinner';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faMapMarkerAlt, faUser, faCrown, faStreetView, faClipboard } from '@fortawesome/free-solid-svg-icons';

import Img from 'react-image';
import { Link } from 'react-router-dom';

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

export const Root = (props) => (
  <div style={{display: 'flex'}} {...props}/>
)

export const Sidebar = (props) => (
  <div style={{width: '22vw', height: '100vh', overlow: 'auto', background: '#eee'}} {...props}/>
)

export const SidebarItem = (props) => (
  <div style={{whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', padding: '5px 10px'}} {...props}/>
)

export const Main = (props) => (
  <div style={{flex: 1, height: '100vh', overflow: 'auto'}}>
    <div style={{padding: '20px'}} {...props}/>
  </div>
)

export const Icon = (props) => (
  <FontAwesomeIcon style={{width: 25}} {...props} />
)

export const MapMarker = (props) => (
  <FontAwesomeIcon color="red" size="2x" icon={faMapMarkerAlt} {...props} />
)

export const Loader = (props) => (
  <LoaderSpinner type="ThreeDots" {...props} />
)

export const RootLoader = (props) => {
  if (props.flag) return (<Loader />);
  else return (
    <div>
      <Icon icon={faSync} color="green" onClick={props.func} />
      <div>{props.children}</div>
    </div>
  );
}

export const CardCanvasser = (props) => {
  const timeAgo = new TimeAgo('en-US');
  return (
    <div style={{display: 'flex', padding: '10px'}}>
      <div style={{padding: '5px 10px'}}>
        <Img width={50} src={props.canvasser.avatar} loader={<Loader width={50} />} unloader={<Icon style={{width: 50, height: 50, color: "gray"}} icon={faUser} />} />
      </div>
      <div style={{flex: 1, overflow: 'auto'}}>
        Name: {props.canvasser.name} (<Link to={'/canvassers/'+props.canvasser.id} onClick={() => props.refer.setState({thisCanvasser: props.canvasser})}>view profile</Link>) {(props.canvasser.admin?<Icon icon={faCrown} color="gold" />:'')}<br />
        Location: {(props.canvasser.location?props.canvasser.location:'N/A')} <br />
        Last Login: {timeAgo.format(new Date(props.canvasser.last_seen-30000))}
      </div>
    </div>
  );
}

export async function _loadCanvassers(refer, teamName) {
  let canvassers = [];

  refer.setState({loading: true})

  try {
    let call = 'canvasser/list';
    if (teamName) call = 'team/members/list?teamName='+teamName;

    let res = await fetch('https://'+refer.props.server+'/canvass/v1/'+call, {
      headers: {
        'Authorization': 'Bearer '+(refer.props.jwt?refer.props.jwt:"of the one ring"),
        'Content-Type': 'application/json',
      },
    });
    let data = await res.json();
    canvassers = (data.data?data.data:[]);
  } catch (e) {
    console.warn(e);
  }

  refer.setState({loading: false});

  return canvassers;
}

export const CardTurf = (props) => (
  <div>
    <Icon icon={faStreetView} /> {props.turf.name} (<Link to={'/turf/view/'+props.turf.name} onClick={() => {
      props.refer.setState({thisTurf: props.turf})
    }}>view</Link>)<br />
  <hr />
  </div>
)

export async function _loadTurf(refer, teamName) {
  let turf = [];

  refer.setState({loading: true})

  try {
    let call = 'turf/list';
    if (teamName) call = 'team/turf/list?teamName='+teamName;
    let res = await fetch('https://'+refer.props.server+'/canvass/v1/'+call, {
      headers: {
        'Authorization': 'Bearer '+(refer.props.jwt?refer.props.jwt:"of the one ring"),
        'Content-Type': 'application/json',
      },
    });
    let data = await res.json();
    turf = (data.data?data.data:[]);
  } catch (e) {
    console.warn(e);
  }

  refer.setState({loading: false});

  return turf;
}

export const CardForm = (props) => (
  <div>
    <Icon icon={faClipboard} /> {props.form.name} (<Link to={'/forms/'+props.form.id} onClick={() => {
      props.refer.setState({thisForm: props.form})
    }}>view</Link>)<br />
  <hr />
  </div>
)

export async function _loadForms(refer, teamName) {
  let forms = [];

  refer.setState({loading: true})

  try {
    let uri;

    if (teamName) uri = 'team/form/list?teamName='+teamName;
    else uri = 'form/list';

    let res = await fetch('https://'+refer.props.server+'/canvass/v1/'+uri, {
      headers: {
        'Authorization': 'Bearer '+(refer.props.jwt?refer.props.jwt:"of the one ring"),
        'Content-Type': 'application/json',
      },
    });
    let data = await res.json();
    forms = (data.data?data.data:[]);
  } catch (e) {
    console.warn(e);
  }

  refer.setState({loading: false});

  return forms;
}
