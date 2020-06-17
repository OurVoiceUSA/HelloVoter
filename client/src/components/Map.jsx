import React, { Component } from 'react';

import {Map, InfoWindow, Marker, Polygon, GoogleApiWrapper} from 'google-maps-react';
import Select from 'react-select';
import {geolocated} from 'react-geolocated';

import {
  RootLoader,
  _browserLocation,
  _searchStringify,
  _loadForms,
  _loadTurfs,
  _loadAddressData,
  _loadPeopleAddressData,
  geojson2polygons,
} from '../common.js';

import { CardForm } from './Forms';

export class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      global: props.global,
      turfs: [],
      addresses: [],
      showingInfoWindow: false,
      selectedPlace: {},
      selectedFormsOption: {},
      formId: null,
    };
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    const { global } = this.state;

    let turfs = [], forms = [], formOptions = [{label: "None"}];

    [
      turfs,
      forms,
    ] = await Promise.all([
      _loadTurfs(global, true),
      _loadForms(global),
    ]);

    forms.forEach(f => {
      formOptions.push({
        value: _searchStringify(f),
        id: f.id,
        label: <CardForm global={global} key={f.id} form={f} refer={this} />,
      });
    });

    this.setState({turfs, forms, formOptions});
  }

  handleFormsChange = async selectedFormsOption => {
    if (!selectedFormsOption) selectedFormsOption = [];
    this.setState({selectedFormsOption, formId: selectedFormsOption.id}, () => this.loadMarkerData());
  }

  onMarkerClick = async (props, marker, e) => {
    const { formId } = this.state;
    this.setState({showingInfoWindow: true});
    let data = await _loadPeopleAddressData(global, props.address.id, formId);
    let place = data[0];
    place.title = props.title;
    this.setState({
      selectedPlace: place,
      activeMarker: marker,
    });
  }

  onTurfClick = async (props) => {
    console.log(props);
    this.setState({
      infoLocation: props.paths[0],
      activeTurf: props.name,
    });
  }

  loadMarkerData = async (mapProps, map) => {
    const { global } = this.state;

    let longitude, latitude;

    if (map) {
      longitude = map.center.lng();
      latitude = map.center.lat();
      this.setState({longitude, latitude});
    } else {
      longitude = this.state.longitude;
      latitude = this.state.latitude;
    }

    let addresses = await _loadAddressData(global, longitude, latitude, this.state.formId);
    this.setState({addresses});
  }

  onMapClicked = (props) => {
    if (this.state.showingInfoWindow) {
      this.setState({
        showingInfoWindow: false,
        activeMarker: null
      });
    }
  };

  statusColor(obj) {
    if (!obj.visits || obj.visits.length === 0) return 'purple';
    let visit = obj.visits[0];

    switch (visit.status) {
    case 0: return 'yellow';
    case 1: return 'green';
    case 2: return 'red';
    default: return 'purple';
    }
  }

  render() {
    let polygons = [];
    const { addresses, selectedPlace } = this.state;

    let location = _browserLocation(this.props);
    if (!location.lng || !location.lat) return (<div>Loading map...</div>);

    this.state.turfs.forEach((c) => {
      if (c.geometry)
        geojson2polygons(JSON.parse(c.geometry)).forEach((p) => polygons.push({name: c.name, polygon: p}));
    });

    return (
      <RootLoader flag={this.state.loading} func={() => this.loadMarkerData()}>

        <div style={{display: 'flex' }}>
          Show interaction status by Form:
          <Select
            value={this.state.selectedFormsOption}
            onChange={this.handleFormsChange}
            options={this.state.formOptions}
            isSearchable={true}
            placeholder="None"
          />
        </div>

        <Map
          google={this.props.google}
          zoom={17}
          initialCenter={location}
          onReady={this.loadMarkerData}
          onDragend={this.loadMarkerData}
          onClick={this.onMapClicked}>
          {addresses.map((a, idx) => (
            <Marker
              key={idx}
              onClick={this.onMarkerClick}
              title={a.address.street+", "+a.address.city+", "+a.address.state+", "+a.address.zip}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/"+this.statusColor(a)+"-dot.png",
              }}
              address={a.address}
              position={{lng: a.address.longitude, lat: a.address.latitude}} />
          ))}
          {polygons.map((p, idx) => (
            <Polygon
              key={idx}
              paths={p.polygon}
              name={p.name}
              onClick={this.onTurfClick}
              strokeColor="#0000FF"
              strokeWeight={5}
              fillColor="#000000"
              fillOpacity={0} />
          ))}
          <InfoWindow
            marker={this.state.activeMarker}
            visible={this.state.showingInfoWindow}>
            <ModalMarker place={selectedPlace} />
          </InfoWindow>
          <InfoWindow position={this.state.infoLocation} visible={(this.state.activeTurf?true:false)}>
            <h1>Turf: {this.state.activeTurf}</h1>
          </InfoWindow>
        </Map>
      </RootLoader>
    );
  }
}

const ModalMarker = props => {
  let people = props.place.people;
  let units = props.place.units;

  if (!people) people = [];
  if (!units) units = [];

  return (
    <div>
      <h1>{props.place.title}</h1>
      {(units.length?'This is a multi unit address with '+units.length+' units.':'')}
      {people.map((p) => <ModalPerson person={p} />)}
    </div>
  );
};

const ModalPerson = props => {
  let attrs = props.person.attrs;
  if (!attrs) attrs = [];
  let name = '';
  let party = '';

  attrs.forEach(a => {
    if (a.name === 'Name') name = a.value;
    if (a.name === 'Party Affiliation') party = a.value;
  });

  return (
    <div>
      <b>Name: {name}</b><br />
      <b>Party: {party}</b>
    </div>
  );
};

export default GoogleApiWrapper((props) => ({apiKey: props.apiKey}))(geolocated({
  positionOptions: {
    enableHighAccuracy: false,
  },
  userDecisionTimeout: 5000,
})(App));
