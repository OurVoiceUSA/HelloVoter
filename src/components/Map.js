import React, { Component } from 'react';

import GoogleMaps from 'google-map-react';

import { google_api_key } from '../config.js';

export default class App extends Component {
  render() {
    return (
      <div style={{ height: '100vh', width: '100%' }}>
        <GoogleMaps
          bootstrapURLKeys={{ key: google_api_key }}
          defaultCenter={{lat: 33.9208231, lng: -118.3281370}}
          defaultZoom={11}
        >
          <Pin
            lat={59.955413}
            lng={30.337844}
          />
        </GoogleMaps>
      </div>
    );
  }
}

const Pin = (props) => (
  <div>
    FOOBAR
  </div>
)

