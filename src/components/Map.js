import React, { Component } from 'react';

import GoogleMaps from 'google-map-react';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      google_maps_key: null,
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
