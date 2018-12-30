import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import {geocodeByAddress, getLatLng} from 'react-places-autocomplete';
import circleToPolygon from 'circle-to-polygon';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import t from 'tcomb-form';

import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';

import { faStreetView } from '@fortawesome/free-solid-svg-icons';

import { us_states } from 'ourvoiceusa-sdk-js';

import { CardVolunteer } from './Volunteers.js';
import { CardTeam } from './Teams.js';

import {
  _fetch, notify_error, notify_success, _handleSelectChange, _searchStringify,
  _loadTurfs, _loadTurf, _loadTeams, _loadVolunteers,
  PlacesAutocomplete, RootLoader, Icon, DialogSaving,
} from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = this.initState();

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

  initState() {
    let perPage = localStorage.getItem('turfperpage');
    if (!perPage) perPage = 5;

    return {
      loading: true,
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
      menuDelete: false,
    };
  }

  handleClickDelete = () => {
    this.setState({ menuDelete: true });
  };

  handleCloseDelete = () => {
    this.setState({ menuDelete: false });
  };

  handlePageNumChange(obj) {
    localStorage.setItem('volunteersperpage', obj.value);
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
    this.setState({address, saving: true})
    try {
      let res = await geocodeByAddress(address);
      let pos = await getLatLng(res[0]);
      this.setState({addressCoords: pos});
    } catch (e) {
      notify_error(e, "Unable to search or geocode address.");
    }
    this.setState({saving: false});
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
    this.setState({saving: true});
    let reader = new FileReader();
    reader.onload = (event) => {
      this.setState({importFileData: event.target.result, saving: false});
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
    if (this.state.saving) return false;
    if (!this.state.selectedDrawOption) return false;
    if (this.state.selectedTypeOption && this.state.selectedTypeOption.value === "state") return true;
    if (this._showDistrictOption() && this.state.selectedDistrictOption) return true;
    if (this.state.importFileData !== null) return true;
    if (this.state.addressCoords !== null) return true;
    return false;
  }

  _deleteTurf = async (id) => {
    this.setState({saving: true, menuDelete: false});
    try {
      await _fetch(this.props.server, '/volunteer/v1/turf/delete', 'POST', {turfId: id});
      notify_success("Turf has been deleted.");
    } catch (e) {
      notify_error(e, "Unable to delete turf.");
    }
    this.setState({saving: false});

    this._loadData();
    window.location.href = "/HelloVoterHQ/#/turf/";
  }

  _createTurf = async () => {
    let json = this.addTurfForm.getValue();
    if (json === null) return;

    this.setState({saving: true});

    let objs = [];

    if (this.state.importFileData !== null) {
      try {
        objs.push(JSON.parse(this.state.importFileData));
      } catch (e) {
        notify_error(e, "Unable to parse import data file.");
        return this.setState({saving: false});
      }
    } else if (this.state.selectedDrawOption.value === "radius") {
      objs.push(circleToPolygon([this.state.addressCoords.lng,this.state.addressCoords.lat],1000));
    } else {
      let state = this.state.selectedStateOption.value;

      try {
        if (this.state.selectedDistrictOption && this.state.selectedDistrictOption.value === 'all') {
          for (let i in this.state.districtOptions) {
            if (this.state.districtOptions[i].value === 'all') continue;
            let res = await fetch(this.urlFromDist(state, this.state.selectedTypeOption.value, this.state.districtOptions[i].value));
            let obj = await res.json();
            obj.name = this.state.districtOptions[i].value;
            objs.push(obj);
          }
        } else {
          let res = await fetch(this.urlFromDist(state, this.state.selectedTypeOption.value, (this.state.selectedDistrictOption?this.state.selectedDistrictOption.value:null)));
          objs.push(await res.json());
        }
      } catch (e) {
        notify_error(e, "Unable to fetch district info data.");
        return this.setState({saving: false});
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

        await _fetch(this.props.server, '/volunteer/v1/turf/create', 'POST', {
          name: name,
          geometry: geometry,
        });
      }
      notify_success("Turf has been created.");
    } catch (e) {
      notify_error(e, "Unable to create turf.");
    }
    this.setState({saving: false});

    window.location.href = "/HelloVoterHQ/#/turf/";
    this._loadData();
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
    this.setState({loading: true, search: ""});
    let turf = [];

    try {
      turf = await _loadTurfs(this);
    } catch (e) {
      notify_error(e, "Unable to load turf.");
    }
    this.setState(this.initState());
    this.setState({loading: false, turf})
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
      if (this.state.search && !_searchStringify(t).includes(this.state.search)) return;
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
                <button onClick={() => this._createTurf()}>
                  Submit
                </button>
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
              <Button onClick={this.handleClickDelete} color="primary">
                Delete Turf
              </Button>
              <Dialog
                open={this.state.menuDelete}
                onClose={this.handleCloseDelete}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                <DialogTitle id="alert-dialog-title">Are you sure you wish to delete this turf?</DialogTitle>
                <DialogActions>
                  <Button onClick={this.handleCloseDelete} color="primary" autoFocus>
                    No
                  </Button>
                  <Button onClick={() => this._deleteTurf(props.match.params.id)} color="primary">
                    Yes
                  </Button>
                </DialogActions>
              </Dialog>
            </div>
          )} />
          <DialogSaving flag={this.state.saving} />
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
      <Link to={'/turf/add'}><button>Add Turf</button></Link>
      {paginate}
      {list}
      {paginate}
     </div>
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
            :<CircularProgress />}
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
    this.props.refer.setState({saving: true});
    try {
      let obj = _handleSelectChange(this.state.selectedTeamsOption, selectedTeamsOption);

      for (let i in obj.add) {
        await _fetch(this.state.server, '/volunteer/v1/turf/assigned/team/add', 'POST', {teamId: obj.add[i], turfId: this.props.id});
      }

      for (let i in obj.rm) {
        await _fetch(this.state.server, '/volunteer/v1/turf/assigned/team/remove', 'POST', {teamId: obj.rm[i], turfId: this.props.id});
      }

      notify_success("Team assignments saved.");
      this.setState({ selectedTeamsOption });
    } catch (e) {
      notify_error(e, "Unable to add/remove teams.");
    }
    this.props.refer.setState({saving: false});
  }

  handleMembersChange = async (selectedMembersOption) => {
    this.props.refer.setState({saving: true});
    try {
      let obj = _handleSelectChange(this.state.selectedMembersOption, selectedMembersOption);

      for (let i in obj.add) {
        await _fetch(this.state.server, '/volunteer/v1/turf/assigned/volunteer/add', 'POST', {cId: obj.add[i], turfId: this.props.id});
      }

      for (let i in obj.rm) {
        await _fetch(this.state.server, '/volunteer/v1/turf/assigned/volunteer/remove', 'POST', {cId: obj.rm[i], turfId: this.props.id});
      }

      notify_success("Volunteer assignments saved.");
      this.setState({ selectedMembersOption });
    } catch (e) {
      notify_error(e, "Unable to add/remove teams.");
    }
    this.props.refer.setState({saving: false});
  }

  _loadData = async () => {
    let turf = {}, volunteers = [], members = [], teams = [], teamsSelected = [];

    this.setState({loading: true})

    try {
      [turf, volunteers, members, teams, teamsSelected] = await Promise.all([
        _loadTurf(this, this.props.id, true),
        _loadVolunteers(this.props.refer),
        _loadVolunteers(this.props.refer, 'turf', this.props.id),
        _loadTeams(this.props.refer),
        _loadTeams(this.props.refer, 'turf', this.props.id),
      ]);
    } catch (e) {
      notify_error(e, "Unable to load turf info.");
      return this.setState({loading: false});
    }

    let teamOptions = [];
    let membersOption = [];
    let selectedTeamsOption = [];
    let selectedMembersOption = [];

    teams.forEach((t) => {
      teamOptions.push({value: _searchStringify(t), id: t.id, label: (
        <CardTeam key={t.id} team={t} refer={this} />
      )});
    });

    teamsSelected.forEach((t) => {
      selectedTeamsOption.push({value: _searchStringify(t), id: t.id, label: (<CardTeam key={t.id} team={t} refer={this} />)});
    })

    volunteers.forEach((c) => {
      membersOption.push({value: _searchStringify(c), id: c.id, label: (<CardVolunteer key={c.id} volunteer={c} refer={this} />)});
    });

    members.forEach((c) => {
      selectedMembersOption.push({value: _searchStringify(c), id: c.id, label: (<CardVolunteer key={c.id} volunteer={c} refer={this} />)});
    });

    this.setState({turf, volunteers, teamOptions, membersOption, selectedTeamsOption, selectedMembersOption, loading: false});
  }

  render() {
    const { turf } = this.state;

    if (!turf || this.state.loading) {
      return (<CircularProgress />);
    }

    return (
      <div>
        <div style={{display: 'flex', padding: '10px'}}>
          <div style={{padding: '5px 10px'}}>
            <Icon icon={faStreetView} style={{width: 50, height: 50, color: "gray"}} /> {turf.name} {(this.props.edit?'':(<Link to={'/turf/view/'+turf.id}>view</Link>))}
          </div>
        </div>
        {this.props.edit?<CardTurfFull turf={turf} refer={this} />:''}
      </div>
    );
  }
}

export const CardTurfFull = (props) => (
  <div>
    <div>
      <br />
      Teams assigned to this turf:
      <Select
        value={props.refer.state.selectedTeamsOption}
        onChange={props.refer.handleTeamsChange}
        options={props.refer.state.teamOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Volunteers assigned directly to this turf:
      <Select
        value={props.refer.state.selectedMembersOption}
        onChange={props.refer.handleMembersChange}
        options={props.refer.state.membersOption}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
  </div>
);
