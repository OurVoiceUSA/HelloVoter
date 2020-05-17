import React, { Component } from 'react';
import { BackHandler, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Toast, Container, Content, Footer, FooterTab, Text, Button, Spinner } from 'native-base';
import { WalkthroughElement, startWalkthrough } from 'react-native-walkthrough';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome';
import RNGooglePlaces from 'react-native-google-places';
import NetInfo from '@react-native-community/netinfo';
import KeepAwake from 'react-native-keep-awake';
import { debounce } from 'throttle-debounce';
import QRCode from 'qrcode';

import {
  DINFO, STORAGE_KEY_SETTINGS, STORAGE_KEY_RETRY,
  api_base_uri, _doGeocode, _getApiToken, openURL, getEpoch, getLastVisit, getPinColor,
  makeTooltipContent, triggerNetworkWarning, deepCopy, geojson2polygons, ingeojson,
} from '../../lib/common';

import { SelectFormDialog, NewAddressDialog } from './FormDialogs';
import DispatchTab, { walkthroughDispatch } from './DispatchTab';
import SettingsTab, { walkthroughSettings } from './SettingsTab';
import ListTab, { walkthroughListView } from './ListTab';
import LocationComponent from './LocationComponent';
import { HVConfirmDialog } from './HVComponent';
import * as storage from '../../lib/storage';

export default class Canvassing extends LocationComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      myPosition: {latitude: -118.3281370, longitude: 33.9208231},
      region: {latitudeDelta: 0.004, longitudeDelta: 0.004},
    };
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    const { myPosition, region } = this.state;

    return (
      <View style={styles.map}>
            <Text>HELLO, WORLD!!</Text>

            <MapView
              ref={component => this.map = component}
              initialRegion={{latitude: myPosition.latitude, longitude: myPosition.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta}}
              style={styles.map}
              showsUserLocation={true}
              followsUserLocation={false}
              keyboardShouldPersistTaps={true}
              showsIndoors={false}
              showsTraffic={false}
              {...this.props}>
            </MapView>
      </View>
    );

  }

}

const styles = StyleSheet.create({
  icon: {
    justifyContent: 'center',
    borderRadius: 10,
    padding: 10,
  },
  iconContainer: {
    backgroundColor: '#ffffff', width: 65, height: 65, borderRadius: 65,
    borderWidth: 2, borderColor: '#000000',
    alignItems: 'center', justifyContent: 'center', margin: 2.5,
  },
  turfInfoContainer: {
    backgroundColor: '#ffffff', width: 125, height: 45,
    borderWidth: 2, borderColor: '#000000',
    alignItems: 'center', justifyContent: 'center', margin: 2.5,
  },
  map: {
    flex: 1,
    ...StyleSheet.absoluteFillObject,
  },
});
