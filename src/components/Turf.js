import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import t from 'tcomb-form';
import Select from 'react-select';

import { RootLoader, Loader, CardTurf, _loadTurf, us_states } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      saving: false,
      selectedStateOption: null,
      selectedTypeOption: null,
      selectedDistrictOption: null,
      districtOptions: [],
      turf: [],
      thisTurf: {},
    };

    this.formServerItems = t.struct({
      name: t.String,
    });

    this.formServerOptions = {
      fields: {
        server: {
          label: 'Turf Name',
          error: 'You must enter a turf name.',
        },
      },
    };

  }

  onChangeTurf(addTurfForm) {
    this.setState({addTurfForm})
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

  _showDistrictOption() {
    if (!this.state.selectedTypeOption) return false;
    switch (this.state.selectedTypeOption.value) {
      case 'cd':
      case 'sldu':
      case 'sldl':
        return true;
    }
    return false;
  }

  _saveTurf = async () => {

    this.setState({saving: true});

    let uri;
    let state = this.state.selectedStateOption.value;

    switch (this.state.selectedTypeOption.value) {
      case 'state':
        uri = 'states/'+state+'/shape.geojson';
        break;
      case 'cd':
        // TODO: handle the fact there are new years with less in them
        uri = 'cds/2016/'+this.state.selectedDistrictOption.value+'/shape.geojson';
        break;
      case 'sldu':
        uri = 'states/'+state+'/sldu/'+this.state.selectedDistrictOption.value+'.geojson';
        break;
      case 'sldl':
        uri = 'states/'+state+'/sldl/'+this.state.selectedDistrictOption.value+'.geojson';
        break;
      default:
        throw "unknown selectedTypeOption";
    }

    try {

      let res = await fetch ('https://raw.githubusercontent.com/OurVoiceUSA/districts/gh-pages/'+uri)
      let geometry = await res.json();

      res = await fetch('https://'+this.props.server+'/canvass/v1/turf/create', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.state.thisTurf.name,
          geometry: geometry,
        }),
      });
    } catch (e) {
      console.warn(e);
    }

    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/turf/add', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({name: this.state.selectedDistrictOption.value}),
      });
    } catch (e) {
      console.warn(e);
    }

    this.setState({saving: false});
  }

  _deleteTurf = async () => {
    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/turf/delete', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({name: this.state.thisTurf}),
      });
    } catch (e) {
      console.warn(e);
    }
    window.location.href = "/HelloVoter/#/turf/";
    _loadTurf(this);
  }

  _createTurf = async () => {
    let json = this.addTurfForm.getValue();
    if (json === null) return;

    let res = await fetch('https://'+this.props.server+'/canvass/v1/turf/create', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({name: json.name}),
    });
    window.location.href = "/HelloVoter/#/turf/";
    this._loadTurf();
  }

  componentDidMount() {
    this._loadTurf();
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

    let dist = [];
    let objs = await res.json();

    switch (this.state.selectedTypeOption.value) {
      case 'cd':
        objs.map((o) => {
          if (o.name.includes(this.state.selectedStateOption.value)) dist.push({value: o.name, label: o.name});
        });
        break;
      default:
        objs.map((o) => {
          let val = o.name.replace('.geojson', '');
          dist.push({value: val, label: val});
        });
      }

    this.setState({districtOptions: dist});

  }

  _loadTurf = async () => {
    this.setState({loading: true})
    let turf = await _loadTurf(this);
    this.setState({loading: false, turf: turf})
  }

  render() {

    let stateOptions = [];
    let typeOptions = [
      {value: 'state', label: 'State'},
      {value: 'cd', label: 'Congressional'},
      {value: 'sldu', label: 'State Senate'},
      {value: 'sldl', label: 'State House'},
    ];

    Object.keys(us_states).map((k) => stateOptions.push({value: k, label: us_states[k]}));

    return (
      <Router>
        <div>
          <Route exact={true} path="/turf/" render={() => (
            <RootLoader flag={this.state.loading} func={this._loadTurf}>
              {(this.state.loading?'loading':this.state.turf.map(t => <CardTurf key={t.name} turf={t} refer={this} />))}
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
              <button onClick={() => this._createTurf()}>
                Submit
              </button>
            </div>
          )} />
          <Route path="/turf/edit/:name" render={() => (
            <div>
              <h3>{this.state.thisTurf.name}</h3>
              State or region:
              <Select
                value={this.state.selectedStateOption}
                onChange={this.handleStateChange}
                options={stateOptions}
                isSearchable={true}
                placeholder="Select state or region"
              />

              {this.state.selectedStateOption?
              <div><br />
                District Type:
                <Select
                  value={this.state.selectedTypeOption}
                  onChange={this.handleTypeChange}
                  onMenuClose={this.selectedTypeFetch}
                  options={typeOptions}
                  isSearchable={true}
                  placeholder="Select district for this turf"
                />
              </div>
              :''}

              {this._showDistrictOption()?
              <div><br />
                District Number:
                {this.state.districtOptions.length?
                <Select
                  value={this.state.selectedDistrictOption}
                  onChange={this.handleDistrictChange}
                  options={this.state.districtOptions}
                  isSearchable={true}
                  placeholder="Select district for this turf"
                />
                :<Loader />}
              </div>
              :''}

              <br />
              {(this.state.saving?<Loader />:<button onClick={() => this._saveTurf()}>Save Turf</button>)}
              <br />
              <br />
              <br />
              <button onClick={() => this._deleteTurf()}>Delete Turf</button>
            </div>
          )} />
        </div>
      </Router>
    );
  }
}
