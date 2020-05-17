import React from 'react';
import { Platform, DeviceEventEmitter } from 'react-native';
import RNGLocation from 'react-native-google-location';

import { permissionLocation } from './functions';
import { sleep } from '../../lib/common';
import HVComponent from './HVComponent';

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

  wait4pos = async () => {
    for (let i = 0; i < 100; i++) {
      if (this.state.myPosition.longitude && this.state.myPosition.latitude) return true;
      else await sleep(100);
    }
    return false;
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
    } catch(e) {
      console.warn(e);
    }

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
        this.timerID = setInterval(() => this.getLocation(), 60000);
      }
    }

    this.setState({ locationAccess: access });

    if (access) await this.wait4pos();

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
