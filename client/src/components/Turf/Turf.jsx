import React, { Component } from 'react';

import { HashRouter as Router, Route } from 'react-router-dom';
import { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import circleToPolygon from 'circle-to-polygon';
import Select from 'react-select';
import t from 'tcomb-form';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';

import { CardTurf, ListTurf, TurfOptions } from './index';

import {
  _fetch,
  notify_error,
  notify_success,
  _searchStringify,
  _loadTurfs,
  RootLoader,
  DialogSaving,
  asyncForEach,
} from '../../common.js';

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = this.initState(props);
    this.state.global = props.global;

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

    this.onTypeAddress = address => this.setState({ address });
    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  initState(props) {
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
      address: '',
      addressCoords: null,
      search: '',
      perPage: perPage,
      pageNum: 1,
      menuDelete: false,
    };
  }

  handleClickDelete = () => {
    this.setState({ menuDelete: true });
  }

  handleCloseDelete = () => {
    this.setState({ menuDelete: false });
  }

  handlePageNumChange(obj) {
    localStorage.setItem('volunteersperpage', obj.value);
    this.setState({ pageNum: 1, perPage: obj.value });
  }

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  }

  onTypeSearch(event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1,
    });
  }

  submitAddress = async address => {
    this.setState({ address, saving: true });
    try {
      let res = await geocodeByAddress(address);
      let pos = await getLatLng(res[0]);
      this.setState({ addressCoords: pos });
    } catch (e) {
      notify_error(e, 'Unable to search or geocode address.');
    }
    this.setState({ saving: false });
  }

  onChangeTurf(addTurfForm) {
    this.setState({ addTurfForm });
  }

  handleDrawChange = selectedDrawOption => {
    // reset other states
    this.setState({
      selectedDrawOption,
      selectedStateOption: null,
      selectedTypeOption: null,
      selectedDistrictOption: null,
      importFileData: null,
      addressCoords: null,
      address: '',
    });
  }

  handleStateChange = selectedStateOption => {
    this.setState({ selectedStateOption });
  }

  handleTypeChange = selectedTypeOption => {
    this.setState({ selectedTypeOption });
  }

  handleDistrictChange = selectedDistrictOption => {
    this.setState({ selectedDistrictOption });
  }

  handleImportFiles = files => {
    this.setState({ saving: true });
    let reader = new FileReader();
    reader.onload = event => {
      this.setState({ importFileData: event.target.result, saving: false });
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
    if (
      this.state.selectedTypeOption &&
      this.state.selectedTypeOption.value === 'state'
    )
      return true;
    if (this._showDistrictOption() && this.state.selectedDistrictOption)
      return true;
    if (this.state.importFileData !== null) return true;
    if (this.state.addressCoords !== null) return true;
    return false;
  }

  _deleteTurf = async id => {
    const { global } = this.state;

    this.setState({ saving: true, menuDelete: false });
    try {
      await _fetch(global, '/turf/delete', 'POST', {
        turfId: id,
      });
      notify_success('Turf has been deleted.');
    } catch (e) {
      notify_error(e, 'Unable to delete turf.');
    }
    this.setState({ saving: false });

    this._loadData();
    window.location.href = '/HelloVoterHQ/#/turf/';
  }

  _createTurf = async () => {
    const { global } = this.state;

    let json = this.addTurfForm.getValue();
    if (json === null) return;

    this.setState({ saving: true });

    let objs = [];

    if (this.state.importFileData !== null) {
      try {
        let geoData = JSON.parse(this.state.importFileData);
        if (geoData.type === "FeatureCollection") {
          geoData.features.forEach(g => {
            if (g.properties.name) g.name = g.properties.name;
            else if (g.properties.NAME) g.name = g.properties.NAME;
            else g.name = g.properties.precinctid + (g.properties.subprecinc?" "+g.properties.subprecinc:"");
            objs.push(g);
          });
        } else {
          objs.push(geoData);
        }
      } catch (e) {
        notify_error(e, 'Unable to parse import data file.');
        return this.setState({ saving: false });
      }
    } else if (this.state.selectedDrawOption.value === 'radius') {
      objs.push(
        circleToPolygon(
          [this.state.addressCoords.lng, this.state.addressCoords.lat],
          1000
        )
      );
    } else {
      let state = this.state.selectedStateOption.value;

      try {
        if (
          this.state.selectedDistrictOption &&
          this.state.selectedDistrictOption.value === 'all'
        ) {
          for (let i in this.state.districtOptions) {
            if (this.state.districtOptions[i].value === 'all') continue;
            let res = await fetch(
              this.urlFromDist(
                state,
                this.state.selectedTypeOption.value,
                this.state.districtOptions[i].value
              )
            );
            let obj = await res.json();
            obj.name = this.state.districtOptions[i].value;
            objs.push(obj);
          }
        } else {
          let res = await fetch(
            this.urlFromDist(
              state,
              this.state.selectedTypeOption.value,
              this.state.selectedDistrictOption
                ? this.state.selectedDistrictOption.value
                : null
            )
          );
          objs.push(await res.json());
        }
      } catch (e) {
        notify_error(e, 'Unable to fetch district info data.');
        return this.setState({ saving: false });
      }
    }

    try {
      let failed = 0;
      let success = 0;
      await asyncForEach(objs, async (obj) => {
        let geometry;
        let name;

        if (obj.geometry) geometry = obj.geometry;
        else geometry = obj;

        if (obj.name) name = json.name + ' ' + obj.name;
        else name = json.name;

        try {
          await _fetch(global, '/turf/create', 'POST', {name, geometry});
          success++;
        } catch (e) {
          failed++;
        }
      });
      notify_success('Created '+success+' Turf.');
      if (failed > 0) notify_error({success, failed}, 'Failed to create '+failed+' Turf.');
    } catch (e) {
      notify_error(e, 'Unable to create turf.');
    }
    this.setState({ saving: false });

    window.location.href = '/HelloVoterHQ/#/turf/';
    this._loadData();
  }

  urlFromDist(state, type, value) {
    let uri;

    switch (type) {
    case 'state':
      uri = 'states/' + state + '/shape.geojson';
      break;
    case 'cd':
      // TODO: handle the fact there are new years with less in them
      uri = 'cds/2016/' + value + '/shape.geojson';
      break;
    case 'sldu':
      uri = 'states/' + state + '/sldu/' + value + '.geojson';
      break;
    case 'sldl':
      uri = 'states/' + state + '/sldl/' + value + '.geojson';
      break;
    default:
      throw new Error('unknown selectedTypeOption');
    }

    return (
      'https://raw.githubusercontent.com/OurVoiceUSA/districts/gh-pages/' + uri
    );
  }

  componentDidMount() {
    this._loadData();
  }

  selectedTypeFetch = async () => {
    let uri;

    if (!this.state.selectedTypeOption) return;

    this.setState({ districtOptions: [] });

    let state = this.state.selectedStateOption.value;

    switch (this.state.selectedTypeOption.value) {
    case 'cd':
      // TODO: handle the fact there are new years with less in them
      uri = 'cds/2016/';
      break;
    case 'sldu':
      uri = 'states/' + state + '/sldu/';
      break;
    case 'sldl':
      uri = 'states/' + state + '/sldl/';
      break;
    default:
      return;
    }

    let res = await fetch(
      'https://api.github.com/repos/OurVoiceUSA/districts/contents/' + uri
    );

    let dist = [{ value: 'all', label: 'Create all of them!' }];
    let objs = await res.json();

    switch (this.state.selectedTypeOption.value) {
    case 'cd':
      objs.forEach(o => {
        if (o.name.includes(this.state.selectedStateOption.value))
          dist.push({ value: o.name, label: o.name });
        return;
      });
      break;
    default:
      objs.forEach(o => {
        let val = o.name.replace('.geojson', '');
        dist.push({ value: val, label: val });
      });
    }

    this.setState({ districtOptions: dist });
  }

  _loadData = async () => {
    const { global } = this.state;

    this.setState({ loading: true, search: '' });
    let turf = [];

    try {
      turf = await _loadTurfs(global);
    } catch (e) {
      notify_error(e, 'Unable to load turf.');
    }
    this.setState(this.initState());
    this.setState({ loading: false, turf });
  }

  render() {
    const { global } = this.state;

    let drawOptions = [
      { value: 'select', label: 'Select from legislative boundary' },
      { value: 'import', label: 'Import GeoJSON shape file' },
      { value: 'radius', label: 'Area surrounding an address' },
      { value: 'draw', label: 'Manually draw with your mouse' },
    ];

    let list = [];

    this.state.turf.forEach(t => {
      if (this.state.search && !_searchStringify(t).includes(this.state.search))
        return;
      list.push(t);
    });

    return (
      <Router>
        <div>
          <Route
            exact={true}
            path="/turf/"
            render={() => (
              <RootLoader flag={this.state.loading} func={this._loadData}>
                Search:{' '}
                <input
                  type="text"
                  value={this.state.value}
                  onChange={this.onTypeSearch}
                  data-tip="Search by name, email, location, or admin"
                />
                <br />
                <ListTurf global={global} turf={list} refer={this} />
              </RootLoader>
            )}
          />
          <Route
            exact={true}
            path="/turf/add"
            render={() => (
              <div>
                <t.form.Form
                  ref={ref => (this.addTurfForm = ref)}
                  type={this.formServerItems}
                  options={this.formServerOptions}
                  onChange={e => this.onChangeTurf(e)}
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
                {this._showSubmitButton() ? (
                  <div>
                    <br />
                    <button onClick={() => this._createTurf()}>Submit</button>
                  </div>
                ) : (
                  ''
                )}
              </div>
            )}
          />
          <Route
            path="/turf/view/:id"
            render={props => (
              <div>
                <CardTurf
                  global={global}
                  key={props.match.params.id}
                  id={props.match.params.id}
                  edit={true}
                  refer={this}
                />
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
                  <DialogTitle id="alert-dialog-title">
                    Are you sure you wish to delete this turf?
                  </DialogTitle>
                  <DialogActions>
                    <Button
                      onClick={this.handleCloseDelete}
                      color="primary"
                      autoFocus
                    >
                      No
                    </Button>
                    <Button
                      onClick={() => this._deleteTurf(props.match.params.id)}
                      color="primary"
                    >
                      Yes
                    </Button>
                  </DialogActions>
                </Dialog>
              </div>
            )}
          />
          <DialogSaving flag={this.state.saving} />
        </div>
      </Router>
    );
  }
}
