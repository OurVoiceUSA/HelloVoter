import React, { Component } from 'react';

import {Map, InfoWindow, Marker, Polygon, GoogleApiWrapper} from 'google-maps-react';
import {geojson2polygons} from 'ourvoiceusa-sdk-js';
import {geolocated} from 'react-geolocated';

import { _browserLocation, _loadTurfs, _loadAddressData } from '../common.js';

export class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      turfs: [],
      addresses: [],
      showingInfoWindow: false,
      selectedPlace: {},
    };
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    let turfs = await _loadTurfs(this, null, true);

    this.setState({turfs});
  }

  onMarkerClick = (props, marker, e) => {
    this.setState({
      selectedPlace: props,
      activeMarker: marker,
      showingInfoWindow: true
    });
  }

  loadMarkerData = async (mapProps, map) => {
    let addresses = await _loadAddressData(this, map.center.lng(), map.center.lat());
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

  statusColor(status) {
    switch (status) {
    case 'multi': return 'blue';
    case 'home': return 'green';
    case 'nothome': return 'yellow';
    case 'notinterested': return 'red';
    default: return 'purple';
    }
  }

  render() {
    let polygons = [];
    const { addresses } = this.state;

    let location = _browserLocation(this.props);
    if (!location.lng || !location.lat) return (<div>Loading map...</div>);

    this.state.turfs.forEach((c) => {
      if (c.geometry)
        geojson2polygons(JSON.parse(c.geometry)).forEach((p) => polygons.push(p));
    });

    return (
      <Map
        google={this.props.google}
        zoom={14}
        initialCenter={location}
        onReady={this.loadMarkerData}
        onDragend={this.loadMarkerData}
        onClick={this.onMapClicked}>
        {addresses.map((a, idx) => (
          <Marker
            key={idx}
            onClick={this.onMarkerClick}
            title={a.address.street+" "+a.address.city+" "+a.address.state+" "+a.address.zip}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/"+this.statusColor(a.address.status)+"-dot.png",
            }}
            people={a.people}
            position={{lng: a.address.longitude, lat: a.address.latitude}} />
        ))}
        {polygons.map((p, idx) => (
          <Polygon
            key={idx}
            paths={p}
            strokeColor="#0000FF"
            strokeWeight={5}
            fillColor="#000000"
            fillOpacity={0} />
        ))}
        <InfoWindow
          marker={this.state.activeMarker}
          visible={this.state.showingInfoWindow}>
          <div>
            <h1>{this.state.selectedPlace.title}</h1>
            {JSON.stringify(this.state.selectedPlace.people)}
          </div>
        </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper((props) => ({apiKey: props.apiKey}))(geolocated({
  positionOptions: {
    enableHighAccuracy: false,
  },
  userDecisionTimeout: 5000,
})(App));
