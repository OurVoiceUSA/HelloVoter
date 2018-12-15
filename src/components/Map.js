import React, { Component } from 'react';

import {Map, InfoWindow, Marker, Polygon, GoogleApiWrapper} from 'google-maps-react';
import {geojson2polygons} from 'ourvoiceusa-sdk-js';
import {geolocated} from 'react-geolocated';

import { _browserLocation, _loadTurf, _loadAddresses } from '../common.js';

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
    let addresses = [];

    let turfs = await _loadTurf(this);
    let data = await _loadAddresses(this);

    // only care about address objects
    Object.keys(data).forEach((d) => {
      if (data[d] && data[d].type === "address") {
        addresses.push(data[d]);
      }
    })

    this.setState({turfs, addresses});
  }

  onMarkerClick = (props, marker, e) => {
    this.setState({
      selectedPlace: props,
      activeMarker: marker,
      showingInfoWindow: true
    });
  }

  onMapClicked = (props) => {
    if (this.state.showingInfoWindow) {
      this.setState({
        showingInfoWindow: false,
        activeMarker: null
      })
    }
  };

  render() {
    let polygons = [];
    const { addresses } = this.state;

    let location = _browserLocation(this.props);

    this.state.turfs.forEach((c) => {
      geojson2polygons(JSON.parse(c.geometry)).forEach((p) => polygons.push(p));
    });

    return (
      <Map google={this.props.google} zoom={14} center={location} onClick={this.onMapClicked}>
        {addresses.map((a, idx) => (
          <Marker
            key={idx}
            onClick={this.onMarkerClick}
            title={a.address.join(" ")}
            position={{lat: a.latlng.latitude, lng: a.latlng.longitude}} />
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
