import React, { Component } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSync, faUser, faUsers, faCrown, faStreetView, faClipboard,
  faExclamationTriangle, faCheckCircle, faBan
} from '@fortawesome/free-solid-svg-icons';

import LoaderSpinner from 'react-loader-spinner';
import Select from 'react-select';
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

export function _browserLocation(props) {
  if (!props.isGeolocationAvailable || !props.isGeolocationEnabled) return {access: false};
  if (props.coords) return {access: true, lng: props.coords.longitude, lat: props.coords.latitude};
  return {access: true};
}

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

export async function _loadCanvasser(refer, id) {
  let canvasser = {};
  try {
    let res = await fetch('https://'+refer.state.server+'/canvass/v1/canvasser/get?id='+refer.props.id, {
      headers: {
        'Authorization': 'Bearer '+(refer.state.jwt?refer.state.jwt:"of the one ring"),
        'Content-Type': 'application/json',
      },
    });
    canvasser = await res.json();
  } catch (e) {
    console.warn(e);
  }
  return canvasser;
}

export class CardCanvasser extends Component {

  constructor(props) {
    super(props);

    this.state = {
      server: this.props.refer.props.server,
      jwt: this.props.refer.props.jwt,
      canvasser: this.props.canvasser,
      selectedTeamsOption: null,
      selectedFormsOption: null,
      selectedTurfOption: null,
    };
  }

  componentDidMount() {
    if (!this.state.canvasser) this._loadData();
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
          await fetch('https://'+this.state.server+'/canvass/v1/team/members/add', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer '+(this.state.jwt?this.state.jwt:"of the one ring"),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({teamName: n, cId: this.props.id}),
          });
        }
      };

      // anything in "prior" that isn't in "now" gets removed
      for (let pi in prior) {
        let p = prior[pi];
        if (now.indexOf(p) === -1) {
          await fetch('https://'+this.state.server+'/canvass/v1/team/members/remove', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer '+(this.state.jwt?this.state.jwt:"of the one ring"),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({teamName: p, cId: this.props.id}),
          });
        }
      };

      // refresh canvasser info
      let canvasser = await _loadCanvasser(this, this.props.id);

      this.setState({ selectedTeamsOption, canvasser });
    } catch (e) {

    }
  }

  handleFormsChange = async (selectedFormsOption) => {
    try {
      if (this.state.selectedFormsOption.value) {
              await fetch('https://'+this.state.server+'/canvass/v1/form/assigned/canvasser/remove', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer '+(this.state.jwt?this.state.jwt:"of the one ring"),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fId: this.state.selectedFormsOption.value,
            cId: this.props.id,
            }),
        });
      }
      if (selectedFormsOption.value) {
        await fetch('https://'+this.state.server+'/canvass/v1/form/assigned/canvasser/add', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer '+(this.state.jwt?this.state.jwt:"of the one ring"),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fId: selectedFormsOption.value,
            cId: this.props.id,
            }),
        });
      }
      this.setState({selectedFormsOption});
    } catch (e) {
      console.warn(e);
    }
  }

  handleTurfChange = async (selectedTurfOption) => {
    try {
      if (this.state.selectedTurfOption.value) {
              await fetch('https://'+this.state.server+'/canvass/v1/turf/assigned/canvasser/remove', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer '+(this.state.jwt?this.state.jwt:"of the one ring"),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fId: this.state.selectedTurfOption.value,
            cId: this.props.id,
            }),
        });
      }
      if (selectedTurfOption.value) {
        await fetch('https://'+this.state.server+'/canvass/v1/turf/assigned/canvasser/add', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer '+(this.state.jwt?this.state.jwt:"of the one ring"),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            turfName: selectedTurfOption.value,
            cId: this.props.id,
            }),
        });
      }
      this.setState({selectedTurfOption});
    } catch (e) {
      console.warn(e);
    }
  }

  _loadData = async () => {
    let canvasser = {};

    this.setState({loading: true})

    try {
       canvasser = await _loadCanvasser(this, this.props.id);
    } catch (e) {
      console.warn(e);
    }

    let forms = await _loadForms(this.props.refer);
    let turf = await _loadTurf(this.props.refer);
    let teams = await _loadTeams(this.props.refer);

    let teamOptions = [];
    let selectedTeamsOption = [];
    let selectedFormsOption = [];
    let selectedTurfOption = [];

    let formOptions = [
      {value: '', label: "None"},
    ];

    let turfOptions = [
      {value: '', label: "None"},
      {value: 'auto', label: "Auto-cut turf with 1km of this canvasser's home address"},
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
      formOptions.push({value: f.id, label: f.name})
    })

    turf.forEach((t) => {
      turfOptions.push({value: t.name, label: t.name})
    })

    this.setState({canvasser, teamOptions, formOptions, turfOptions, selectedTeamsOption, selectedFormsOption, selectedTurfOption, loading: false});
  }

  _lockCanvasser = async (canvasser, flag) => {

    try {
      await fetch('https://'+this.state.server+'/canvass/v1/canvasser/'+(flag?'lock':'unlock'), {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.state.jwt?this.state.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({id: canvasser.id}),
      });
    } catch (e) {
      console.warn(e);
    }

    this._loadData();
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
            Name: {canvasser.name} {(this.props.edit?'':(<Link to={'/canvassers/'+canvasser.id} onClick={() => this.props.refer.setState({thisCanvasser: this.props.canvasser})}>view profile</Link>))}
            <CanvasserBadges canvasser={canvasser} />
            <br />
            Location: {(canvasser.location?canvasser.location:'N/A')} <br />
            Last Login: {timeAgo.format(new Date(canvasser.last_seen-30000))}
          </div>
        </div>
        {this.props.edit?<CardCanvasserFull canvasser={canvasser} refer={this} />:''}
      </div>
    );
  }
}

export const CardTeam = (props) => (
  <div key={props.t.name}>
    <Icon style={{width: 35, height: 35, color: "gray"}} icon={faUsers} /> {props.t.name}
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
    # of doors knocked: 0
    <br />
    <br />
    Teams this canvasser is apart of:
    <Select
      value={props.refer.state.selectedTeamsOption}
      onChange={props.refer.handleTeamsChange}
      options={props.refer.state.teamOptions}
      isMulti={true}
      isSearchable={true}
      placeholder="None"
    />
    <br />
    {props.refer.state.selectedTeamsOption.length?
    <div>
      Forms / Turf this users sees based on the above team(s):
      <br />{JSON.stringify(props.canvasser.ass)}
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

export const CanvasserBadges = (props) => {
  let badges = [];
  let id = props.canvasser.id;

  if (props.canvasser.admin) badges.push(<Icon icon={faCrown} color="gold" key={id+"admin"} />);
  if (props.canvasser.locked) badges.push(<Icon icon={faBan} color="red" key={id+"locked"} />);
  else {
    if (props.canvasser.ass.ready) badges.push(<Icon icon={faCheckCircle} color="green" key={id+"ready"} />);
    else badges.push(<Icon icon={faExclamationTriangle} color="red" key={id+"unassigned"} />);
  }

  return badges;
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
    canvassers = await res.json();
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
    <Icon icon={faClipboard} /> {props.form.name} (<Link to={'/forms/edit/'+props.form.id} onClick={() => {
      props.refer.setState({thisForm: props.form})
    }}>view</Link>)<br />
  <hr />
  </div>
)

export async function _loadTeams(refer) {
  let teams = [];

  try {
    let res = await fetch('https://'+refer.props.server+'/canvass/v1/team/list', {
      headers: {
        'Authorization': 'Bearer '+(refer.props.jwt?refer.props.jwt:"of the one ring"),
        'Content-Type': 'application/json',
      },
    });
    teams = await res.json();
  } catch (e) {
    console.warn(e);
  }

  return teams.data;
}

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

export async function _loadAddresses(refer) {
  let addresses = {};
  try {
    let res = await fetch('https://'+refer.props.server+'/canvass/v1/sync', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer '+(refer.props.jwt?refer.props.jwt:"of the one ring"),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({nodes: {}}),
    });
    addresses = await res.json();
  } catch (e) {
    console.warn(e)
  }
  return addresses;
}
