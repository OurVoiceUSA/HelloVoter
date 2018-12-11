import React, { Component } from 'react';

import GoogleMaps from 'google-map-react';

import { MapMarker } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      google_maps_key: null,
      pins: [
        {lat:33.9218230, lng:-118.3281371},
        {lat:33.9328242, lng:-118.3381376},
        {lat:33.9438254, lng:-118.3481379},
      ],
    };
  }

  componentDidMount = async () => {
    let key;
    let error = false;
    try {
      let res = await fetch('https://'+this.props.server+'/canvass/v1/google_maps_key', {
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
      });

      let body = await res.json();
      key = body.google_maps_key;
      if (body.error) error = true;

    } catch (e) {
      console.warn(e);
    }

    this.setState({google_maps_key: (key?{key: key}:null), loading: false, error: error});
  }

  render() {
    if (this.state.loading) return (<div>loading</div>);
    if (this.state.error) return (<div>Awaiting assignment</div>);

    return (
      <div style={{ height: '100vh', width: '100%' }}>
        <GoogleMaps
          bootstrapURLKeys={this.state.google_maps_key}
          defaultCenter={{lat: 33.9208231, lng: -118.3281370}}
          defaultZoom={11}
        >
          {this.state.pins.map((c) => (<MapMarker lat={c.lat} lng={c.lng} />))}
        </GoogleMaps>
      </div>
    );
  }
}
