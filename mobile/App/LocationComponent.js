import React from 'react';
import HVComponent from './HVComponent';

import {
  Platform,
  DeviceEventEmitter,
} from 'react-native';

import RNGLocation from 'react-native-google-location';
import RNGooglePlaces from 'react-native-google-places';
import { permissionLocation } from './common';

if (Platform.OS === 'ios') {
  navigator.geolocation = require('@react-native-community/geolocation');
}

export default class LocationComponent extends HVComponent {

  constructor(props) {
    super(props);

    this.state = {
      myPosition: {latitude: null, longitude: null},
    }
  }

  onLocationChange (e: Event) {
    const { myPosition } = this.state;
    let pos = JSON.parse(JSON.stringify(myPosition));
    pos.latitude = e.Latitude;
    pos.longitude = e.Longitude;
    this.setState({ myPosition: pos });
  }

  requestLocationPermission = async () => {
    access = false;

    try {
      access = await permissionLocation();
    } catch(error) {}

    if (access === true) {
      if (Platform.OS === 'android') {
        if (!this.evEmitter) {
          if (RNGLocation.available() === false) {
            this.setState({ serviceError: true });
          } else {
            this.evEmitter = DeviceEventEmitter.addListener('updateLocation', this.onLocationChange.bind(this));
            RNGLocation.reconnect();
            RNGLocation.getLocation();
          }
        }
      } else {
        await this.getLocation();
        this.timerID = setInterval(() => this.getLocation(), 5000);
      }
    }

    this.setState({ locationAccess: access });

    return access;
  }

  getCurrentPositionAsync(options) {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  getLocation = async () => {
    const { myPosition } = this.state;
    try {
      const position = await this.getCurrentPositionAsync({ enableHighAccuracy: true, timeout: 2000, maximumAge: 1000 });
      let pos = JSON.parse(JSON.stringify(myPosition));
      pos.latitude = position.coords.latitude;
      pos.longitude = position.coords.longitude;
      this.setState({ myPosition: pos });
    } catch (e) {
      console.warn("getLocation(): "+e);
    }
  }

  cleanupLocation() {
    if (Platform.OS === 'ios') {
      clearInterval(this.timerID);
    } else {
      if (this.evEmitter) {
        RNGLocation.disconnect();
        this.evEmitter.remove();
      }
    }
  }

}
