import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import {geocodeByAddress, getLatLng} from 'react-places-autocomplete';
import circleToPolygon from 'circle-to-polygon';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import t from 'tcomb-form';

import { faStreetView } from '@fortawesome/free-solid-svg-icons';

import { us_states } from 'ourvoiceusa-sdk-js';

import { CardCanvasser } from './Canvassers.js';
import { CardTeam } from './Teams.js';

import {
  _fetch, notify_error, notify_success, _loadTurfs, _loadTurf, _loadTeams, _loadCanvassers, _handleSelectChange,
  PlacesAutocomplete, RootLoader, Loader, Icon,
} from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('turfperpage');
    if (!perPage) perPage = 5;

    this.state = {
      loading: true,
      creating: false,
      selectedDrawOption: null,
      selectedStateOption: null,
      selectedTypeOption: null,
      selectedDistrictOption: null,
      districtOptions: [],
      turf: [],
      thisTurf: {},
      importFileData: null,
      address: "",
      addressCoords: null,
      search: "",
      perPage: perPage,
      pageNum: 1,
    };

    this.formServerItems = t.struct({
      name: t.String,
    });

    this.formServerOptions = {
      fields: {
        name: {
          label: 'Turf Name',
          error: 'You must enter a turf name.',
        },
      },
    };

    this.onTypeAddress = (address) => this.setState({ address })
    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  handlePageNumChange(obj) {
    localStorage.setItem('canvassersperpage', obj.value);
    this.setState({pageNum: 1, perPage: obj.value});
  }

  handlePageClick = (data) => {
    this.setState({pageNum: data.selected+1});
  }

  onTypeSearch (event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1,
    })
  }

  submitAddress = async (address) => {
    this.setState({address})
    try {
      let res = await geocodeByAddress(address);
      let pos = await getLatLng(res[0]);
      this.setState({addressCoords: pos});
    } catch (e) {
      notify_error(e, "Unable to search or geocode address.");
    }
  }

  onChangeTurf(addTurfForm) {
    this.setState({addTurfForm})
  }

  handleDrawChange = (selectedDrawOption) => {
    // reset other states
    this.setState({
      selectedDrawOption,
      selectedStateOption: null,
      selectedTypeOption: null,
      selectedDistrictOption: null,
      importFileData: null,
      addressCoords: null,
      address: "",
     });
  }

  handleStateChange = (selectedStateOption) => {
    this.setState({ selectedStateOption });
  }

  handleTypeChange = (selectedTypeOption) => {
    this.setState({ selectedTypeOption });
  }

  handleDistrictChange = (selectedDistrictOption) => {
    this.setState({ selectedDistrictOption });
  }

  handleImportFiles = (files: FileList) => {
    let reader = new FileReader();
    reader.onload = (event) => {
      this.setState({importFileData: event.target.result});
    };
    reader.readAsText(files[0]);
  }

  _showDistrictOption() {
    if (!this.state.selectedTypeOption) return false;
    switch (this.state.selectedTypeOption.value) {
      case 'cd':
      case 'sldu':
      case 'sldl':
        return true;
      default:
        return false;
    }
  }

  _showSubmitButton() {
    if (!this.state.selectedDrawOption) return false;
    if (this.state.selectedTypeOption && this.state.selectedTypeOption.value === "state") return true;
    if (this._showDistrictOption() && this.state.selectedDistrictOption) return true;
    if (this.state.importFileData !== null) return true;
    if (this.state.addressCoords !== null) return true;
    return false;
  }

  _deleteTurf = async (id) => {
    try {
      await _fetch(this.props.server, '/canvass/v1/turf/delete', 'POST', {turfId: id});
    } catch (e) {
      notify_error(e, "Unable to delete turf.");
      return;
    }
    this._loadData();
    window.location.href = "/HelloVoter/#/turf/";
    notify_success("Turf has been deleted.");
  }

  _createTurf = async () => {
    let json = this.addTurfForm.getValue();
    if (json === null) return;

    this.setState({creating: true});

    let objs = [];

    if (this.state.importFileData !== null) {
      try {
        objs.push(JSON.parse(this.state.importFileData));
      } catch (e) {
        notify_error(e, "Unable to parse import data file.");
        this.setState({creating: false});
        return;
      }
    } else if (this.state.selectedDrawOption.value === "radius") {
      objs.push(circleToPolygon([this.state.addressCoords.lng,this.state.addressCoords.lat],1000));
    } else {
      let state = this.state.selectedStateOption.value;

      try {
        if (this.state.selectedDistrictOption.value === 'all') {
          for (let i in this.state.districtOptions) {
            if (this.state.districtOptions[i].value === 'all') continue;
            let res = await fetch(this.urlFromDist(state, this.state.selectedTypeOption.value, this.state.districtOptions[i].value));
            let obj = await res.json();
            obj.name = this.state.districtOptions[i].value;
            objs.push(obj);
          }
        } else {
          let res = await fetch(this.urlFromDist(state, this.state.selectedTypeOption.value, this.state.selectedDistrictOption.value));
          objs.push(await res.json());
        }
      } catch (e) {
        notify_error(e, "Unable to fetch district info data.");
        this.setState({creating: false});
        return;
      }
    }

    try {
      for (let i in objs) {
        let obj = objs[i];
        let geometry;
        let name;

        if (obj.geometry) geometry = obj.geometry;
        else geometry = obj;

        if (this.state.selectedDistrictOption && this.state.selectedDistrictOption.value === 'all')
          name = json.name+' '+obj.name;
        else
          name = json.name;

        await _fetch(this.props.server, '/canvass/v1/turf/create', 'POST', {
          name: name,
          geometry: geometry,
        });
      }
    } catch (e) {
      notify_error(e, "Unable to create turf.");
      this.setState({creating: false});
      return;
    }

    window.location.href = "/HelloVoter/#/turf/";
    this._loadData();
    notify_success("Turf has been created.");
    this.setState({creating: false});
  }

  urlFromDist(state, type, value) {
    let uri;

    switch (type) {
      case 'state':
        uri = 'states/'+state+'/shape.geojson';
        break;
      case 'cd':
        // TODO: handle the fact there are new years with less in them
        uri = 'cds/2016/'+value+'/shape.geojson';
        break;
      case 'sldu':
        uri = 'states/'+state+'/sldu/'+value+'.geojson';
        break;
      case 'sldl':
        uri = 'states/'+state+'/sldl/'+value+'.geojson';
        break;
      default:
        throw new Error("unknown selectedTypeOption");
    }

    return 'https://raw.githubusercontent.com/OurVoiceUSA/districts/gh-pages/'+uri;
  }

  componentDidMount() {
    this._loadData();
  }

  selectedTypeFetch = async () => {
    let uri;

    if (!this.state.selectedTypeOption) return;

    this.setState({districtOptions: []})

    let state = this.state.selectedStateOption.value;

    switch (this.state.selectedTypeOption.value) {
      case 'cd':
        // TODO: handle the fact there are new years with less in them
        uri = 'cds/2016/';
        break;
      case 'sldu':
        uri = 'states/'+state+'/sldu/';
        break;
      case 'sldl':
        uri = 'states/'+state+'/sldl/';
        break;
      default:
        return;
    }

    let res = await fetch('https://api.github.com/repos/OurVoiceUSA/districts/contents/'+uri);

    let dist = [{value: 'all', label: 'Create all of them!'}];
    let objs = await res.json();

    switch (this.state.selectedTypeOption.value) {
      case 'cd':
        objs.forEach((o) => {
          if (o.name.includes(this.state.selectedStateOption.value)) dist.push({value: o.name, label: o.name});
          return;
        });
        break;
      default:
        objs.forEach((o) => {
          let val = o.name.replace('.geojson', '');
          dist.push({value: val, label: val});
        });
    }

    this.setState({districtOptions: dist});

  }

  _loadData = async () => {
    this.setState({loading: true, search: ""})
    let turf = [];

    try {
      turf = await _loadTurfs(this);
    } catch (e) {
      notify_error(e, "Unable to load turf.");
    }
    this.setState({loading: false, turf: turf})
  }

  render() {

    let drawOptions = [
      {value: 'select', label: 'Select from legislative boundary'},
      {value: 'import', label: 'Import GeoJSON shape file'},
      {value: 'radius', label: 'Area surrounding an address'},
      {value: 'draw', label: 'Manually draw with your mouse'},
    ];

    let list = [];

    this.state.turf.forEach(t => {
      if (this.state.search && !t.name.toLowerCase().includes(this.state.search)) return;
      list.push(t);
    });

    return (
      <Router>
        <div>
          <Route exact={true} path="/turf/" render={() => (
            <RootLoader flag={this.state.loading} func={this._loadData}>
              Search: <input type="text" value={this.state.value} onChange={this.onTypeSearch} data-tip="Search by name, email, location, or admin" />
              <br />
              <ListTurf turf={list} refer={this} />
              <Link to={'/turf/add'}><button>Add Turf</button></Link>
            </RootLoader>
          )} />
          <Route exact={true} path="/turf/add" render={() => (
            <div>
              <t.form.Form
                ref={(ref) => this.addTurfForm = ref}
                type={this.formServerItems}
                options={this.formServerOptions}
                onChange={(e) => this.onChangeTurf(e)}
                value={this.state.addTurfForm}
              />

              <br />
              Method of generating turf:
              <Select
                value={this.state.selectedDrawOption}
                onChange={this.handleDrawChange}
                options={drawOptions}
                isSearchable={false}
                placeholder="Select method"
              />

              <TurfOptions refer={this} />

              {this._showSubmitButton()?
              <div><br />
                <SubmitButton refer={this} />
              </div>
              :''}
            </div>
          )} />
          <Route path="/turf/view/:id" render={(props) => (
            <div>
              <CardTurf key={props.match.params.id} id={props.match.params.id} edit={true} refer={this} />
              <br />
              <br />
              <br />
              <button onClick={() => this._deleteTurf(props.match.params.id)}>Delete Turf</button>
            </div>
          )} />
        </div>
      </Router>
    );
  }
}

const ListTurf = (props) => {
  const perPage = props.refer.state.perPage;
  let paginate = (<div></div>);
  let list = [];

  props.turf.forEach((t, idx) => {
    let tp = Math.floor(idx/perPage)+1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardTurf key={t.id} turf={t} refer={props.refer} />);
  });

  paginate = (
    <div style={{display: 'flex'}}>
      <ReactPaginate previousLabel={"previous"}
        nextLabel={"next"}
        breakLabel={"..."}
        breakClassName={"break-me"}
        pageCount={props.turf.length/perPage}
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
      <h3>{props.type}Turf ({props.turf.length})</h3>
      {paginate}
      {list}
      {paginate}
     </div>
   );
};

const SubmitButton = (props) => {
  if (props.refer.state.creating) return (<Loader />);
  return (
    <button onClick={() => props.refer._createTurf()}>
      Submit
    </button>
  );
};

const TurfOptions = (props) => {
  if (!props.refer.state.selectedDrawOption) return (<br />);

  let stateOptions = [];
  Object.keys(us_states).map((k) => stateOptions.push({value: k, label: us_states[k]}));

  let typeOptions = [
    {value: 'state', label: 'State'},
    {value: 'cd', label: 'Congressional'},
    {value: 'sldu', label: 'State Senate'},
    {value: 'sldl', label: 'State House'},
  ];

  switch (props.refer.state.selectedDrawOption.value) {
    case "select":
      return (
        <div>
          <div><br />
            State or region:
            <Select
              value={props.refer.state.selectedStateOption}
              onChange={props.refer.handleStateChange}
              options={stateOptions}
              isSearchable={true}
              placeholder="Select state or region"
            />
          </div>
          {props.refer.state.selectedStateOption?
          <div><br />
            District Type:
            <Select
              value={props.refer.state.selectedTypeOption}
              onChange={props.refer.handleTypeChange}
              onMenuClose={props.refer.selectedTypeFetch}
              options={typeOptions}
              isSearchable={false}
              placeholder="Select district for this turf"
            />
          </div>
          :''}

          {props.refer._showDistrictOption()?
          <div><br />
            District Number:
            {props.refer.state.districtOptions.length?
            <Select
              value={props.refer.state.selectedDistrictOption}
              onChange={props.refer.handleDistrictChange}
              options={props.refer.state.districtOptions}
              isSearchable={true}
              placeholder="Select district for this turf"
            />
            :<Loader />}
          </div>
          :''}
        </div>
      );
    case "import":
      return (
        <div><br />
          <input type="file" accept=".geojson,.json" onChange={ (e) => props.refer.handleImportFiles(e.target.files) } />
        </div>
      );
    case "radius":
      return (
        <div><br />
          Type the address:
          <PlacesAutocomplete
            debounce={500}
            value={props.refer.state.address}
            onChange={props.refer.onTypeAddress}
            onSelect={props.refer.submitAddress}
          />
        </div>
      );
    case "draw":
      return (
        <div><br />
          Use a <a target="_blank" rel="noopener noreferrer" href="https://google-developers.appspot.com/maps/documentation/utils/geojson/">GeoJSON Draw Tool</a>,
          save the file, and then select the "Import GeoJSON shape file" option.
        </div>
      );
    default:
      return (<div>Unknown generation method.</div>);
  }
}

export class CardTurf extends Component {

  constructor(props) {
    super(props);

    this.state = {
      server: this.props.refer.props.server,
      turf: this.props.turf,
      selectedTeamsOption: [],
      selectedMembersOption: [],
    };
  }

  componentDidMount() {
    if (!this.state.turf) this._loadData();
  }

  handleTeamsChange = async (selectedTeamsOption) => {
    try {
      let obj = _handleSelectChange(this.state.selectedTeamsOption, selectedTeamsOption);

      for (let i in obj.add) {
        await _fetch(this.state.server, '/canvass/v1/turf/assigned/team/add', 'POST', {teamId: obj.add[i], turfId: this.props.id});
      }

      for (let i in obj.rm) {
        await _fetch(this.state.server, '/canvass/v1/turf/assigned/team/remove', 'POST', {teamId: obj.rm[i], turfId: this.props.id});
      }

      notify_success("Team assignments saved.");
      this.setState({ selectedTeamsOption });
    } catch (e) {
      notify_error(e, "Unable to add/remove teams.");
    }
  }

  handleTeamsChange = async (selectedMembersOption) => {
    try {
      let obj = _handleSelectChange(this.state.selectedMembersOption, selectedMembersOption);

      for (let i in obj.add) {
        await _fetch(this.state.server, '/canvass/v1/turf/assigned/canvasser/add', 'POST', {cId: obj.add[i], turfId: this.props.id});
      }

      for (let i in obj.rm) {
        await _fetch(this.state.server, '/canvass/v1/turf/assigned/canvasser/remove', 'POST', {cId: obj.rm[i], turfId: this.props.id});
      }

      notify_success("Canvasser assignments saved.");
      this.setState({ selectedMembersOption });
    } catch (e) {
      notify_error(e, "Unable to add/remove teams.");
    }
  }

  _loadData = async () => {
    let turf = {};

    this.setState({loading: true})

    try {
       turf = await _loadTurf(this, this.props.id, true);
    } catch (e) {
      notify_error(e, "Unable to load canavasser info.");
      return;
    }

    let canvassers = await _loadCanvassers(this.props.refer);
    let teams = await _loadTeams(this.props.refer);

    let teamOptions = [];
    let membersOptions = [];
    let selectedTeamsOption = [];
    let selectedMembersOption = [];

    teams.forEach((t) => {
      teamOptions.push({value: t.id, id: t.id, label: (
        <CardTeam key={t.id} team={t} refer={this} />
      )});
    });

    canvassers.forEach((c) => {
      membersOptions.push({value: c.id, id: c.id, label: (<CardCanvasser key={c.id} canvasser={c} refer={this} />)});
    });

    this.setState({turf, canvassers, teamOptions, membersOptions, selectedTeamsOption, selectedMembersOption, loading: false});
  }

  render() {
    const { turf } = this.state;

    if (!turf || this.state.loading) {
      return (<Loader />);
    }

    return (
      <div>
        <div style={{display: 'flex', padding: '10px'}}>
          <div style={{padding: '5px 10px'}}>
            <Icon icon={faStreetView} style={{width: 50, height: 50, color: "gray"}} /> {turf.name} {(this.props.edit?'':(<Link to={'/turf/view/'+turf.id}>view</Link>))}
          </div>
        </div>
      </div>
    );
  }
};
