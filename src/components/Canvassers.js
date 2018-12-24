import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import {geocodeByAddress, getLatLng} from 'react-places-autocomplete';
import ReactPaginate from 'react-paginate';
import ReactTooltip from 'react-tooltip';
import Select from 'react-select';
import Img from 'react-image';

import {
  notify_error, notify_success, _fetch, _loadCanvassers, _loadCanvasser, _loadTeams, _loadForms, _loadTurf, _searchStringCanvasser,
  RootLoader, CardTurf, CardTeam, CardForm, Loader, Icon, PlacesAutocomplete,
} from '../common.js';

import {
  faSync, faUser, faUsers, faCrown, faStreetView, faClipboard,
  faExclamationTriangle, faCheckCircle, faBan, faHome,
} from '@fortawesome/free-solid-svg-icons';

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
TimeAgo.locale(en);

export default class App extends Component {

  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('canvassersperpage');
    if (!perPage) perPage = 5;

    this.state = {
      loading: true,
      canvassers: [],
      search: "",
      perPage: perPage,
      pageNum: 1,
    };

    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  componentDidMount() {
    this._loadData();
  }

  handlePageNumChange(obj) {
    localStorage.setItem('canvassersperpage', obj.value);
    this.setState({pageNum: 1, perPage: obj.value});
  }

  onTypeSearch (event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1,
    })
  }

  _loadData = async () => {
    let canvassers = [];
    this.setState({loading: true, search: ""});
    try {
      canvassers = await _loadCanvassers(this);
    } catch (e) {
      notify_error(e, "Unable to load canvassers.");
    }
    this.setState({loading: false, canvassers});
  }

  handlePageClick = (data) => {
    this.setState({pageNum: data.selected+1});
  }

  render() {

    let ready = [];
    let unassigned = [];
    let denied = [];

    this.state.canvassers.forEach(c => {
      if (this.state.search && !_searchStringCanvasser(c).includes(this.state.search)) return;
      if (c.locked) {
        denied.push(c);
      } else {
        if (c.ass.ready || c.ass.teams.length)
          ready.push(c);
        else
          unassigned.push(c);
      }
    });

    return (
      <RootLoader flag={this.state.loading} func={() => this._loadData()}>
        <Router>
          <div>
            Search: <input type="text" value={this.state.value} onChange={this.onTypeSearch} data-tip="Search by name, email, location, or admin" />
            <br />
            <Link to={'/canvassers/'} onClick={() => this.setState({pageNum: 1})}>Canvassers ({ready.length})</Link>&nbsp;-&nbsp;
            <Link to={'/canvassers/unassigned'} onClick={() => this.setState({pageNum: 1})}>Unassigned ({unassigned.length})</Link>&nbsp;-&nbsp;
            <Link to={'/canvassers/denied'} onClick={() => this.setState({pageNum: 1})}>Denied ({denied.length})</Link>
            <Route exact={true} path="/canvassers/" render={() => (<ListCanvassers refer={this} canvassers={ready} />)} />
            <Route exact={true} path="/canvassers/unassigned" render={() => (<ListCanvassers refer={this} type="Unassigned" canvassers={unassigned} />)} />
            <Route exact={true} path="/canvassers/denied" render={() => (<ListCanvassers refer={this} type="Denied" canvassers={denied} />)} />
            <Route path="/canvassers/view/:id" render={(props) => (
              <CardCanvasser key={props.match.params.id} id={props.match.params.id} edit={true} refer={this} />
            )} />
          </div>
        </Router>
      </RootLoader>
    );
  }
}

const ListCanvassers = (props) => {
  const perPage = props.refer.state.perPage;
  let paginate = (<div></div>);
  let list = [];

  props.canvassers.forEach((c, idx) => {
    let tp = Math.floor(idx/perPage)+1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardCanvasser key={c.id} canvasser={c} refer={props.refer} />);
  });

  paginate = (
    <div style={{display: 'flex'}}>
      <ReactPaginate previousLabel={"previous"}
        nextLabel={"next"}
        breakLabel={"..."}
        breakClassName={"break-me"}
        pageCount={props.canvassers.length/perPage}
        marginPagesDisplayed={1}
        pageRangeDisplayed={8}
        onPageChange={props.refer.handlePageClick}
        containerClassName={"pagination"}
        subContainerClassName={"pages pagination"}
        activeClassName={"active"}
      />
      &nbsp;&nbsp;&nbsp;
      <div style={{width: 75}}>
      # Per Page <Select
        value={{value: perPage, label: perPage}}
        onChange={props.refer.handlePageNumChange}
        options={[
          {value: 5, label: 5},
          {value: 10, label: 10},
          {value: 25, label: 25},
          {value: 50, label: 50},
          {value: 100, label: 100}
        ]}
      />
      </div>
    </div>
  );

  return (
    <div>
      <h3>{props.type}Canvassers ({props.canvassers.length})</h3>
      {paginate}
      {list}
      {paginate}
     </div>
   );
};

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
          await _fetch(this.state.server, '/canvass/v1/team/members/add', 'POST', {teamId: n, cId: this.props.id});
        }
      };

      // anything in "prior" that isn't in "now" gets removed
      for (let pi in prior) {
        let p = prior[pi];
        if (now.indexOf(p) === -1) {
          await _fetch(this.state.server, '/canvass/v1/team/members/remove', 'POST', {teamId: p, cId: this.props.id});
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
      teamOptions.push({value: t.id, label: (
        <CardTeam key={t.name} t={t} />
      )});
      canvasser.ass.teams.forEach((a) => {
        if (a.id === t.id) {
          selectedTeamsOption.push({value: t.id, label: (
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

function extract_addr(addr) {
  let arr = addr.split(', ');
  if (arr.length < 4) return addr;
  arr.shift();
  return arr.join(', ');
}
