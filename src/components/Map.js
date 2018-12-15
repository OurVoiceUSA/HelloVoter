import React, { Component } from 'react';

import {Map, Polygon, GoogleApiWrapper} from 'google-maps-react';
import {geojson2polygons} from 'ourvoiceusa-sdk-js';

import { _loadTurf } from '../common.js';

export class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      turfs: [],
      pins: [
        {lat:33.9218230, lng:-118.3281371},
        {lat:33.9328242, lng:-118.3381376},
        {lat:33.9438254, lng:-118.3481379},
      ],
    };
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    let turfs = await _loadTurf(this);
    this.setState({turfs});
  }

  render() {
    let polygons = [];

    this.state.turfs.forEach((c) => {
      geojson2polygons(JSON.parse(c.geometry)).forEach((p) => polygons.push(p));
    });

    return (
      <Map google={this.props.google} zoom={5} initialCenter={{lat:33.9218230, lng:-118.3281371}}>
        {polygons.map((p, idx) => (
          <Polygon
            key={idx}
            paths={p}
            strokeColor="#0000FF"
            strokeOpacity={0.8}
            strokeWeight={2}
            fillColor="#0000FF"
            fillOpacity={0.35} />
        ))}
      </Map>
    );
  }
}

export default GoogleApiWrapper((props) => ({apiKey: props.apiKey}))(App);
