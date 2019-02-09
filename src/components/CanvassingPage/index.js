import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  NetInfo,
  Text,
  TextInput,
  View,
  Linking,
  ScrollView,
  TouchableHighlight,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
} from 'react-native';

import OVComponent from '../OVComponent';

import { NavigationActions } from 'react-navigation';
import storage from 'react-native-storage-wrapper';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import { API_BASE_URI, _doGeocode, _getApiToken } from '../../common';
import KnockPage from '../KnockPage';
import Modal from 'react-native-simple-modal';
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import t from 'tcomb-form-native';
import _ from 'lodash';
import {geojson2polygons, ingeojson} from 'ourvoiceusa-sdk-js';

TimeAgo.locale(en);

export default class App extends OVComponent {

  constructor(props) {
    super(props);

    this.state = {
      server: props.navigation.state.params.server,
      last_fetch: 0,
      loading: false,
      netInfo: 'none',
      serviceError: null,
      locationAccess: null,
      myPosition: {latitude: null, longitude: null},
      region: {latitudeDelta: 0.004, longitudeDelta: 0.004},
      currentNode: null,
      markers: [],
      DisclosureKey : 'OV_DISCLOUSER',
      isModalVisible: false,
      isKnockMenuVisible: false,
      showDisclosure: "true",
      form: props.navigation.state.params.form,
      user: props.navigation.state.params.user,
      geofence: props.navigation.state.params.form.geofence,
      geofencename: props.navigation.state.params.form.geofencename,
    };

    this.handleConnectivityChange = this.handleConnectivityChange.bind(this);
  }

  componentDidMount() {
    this.requestLocationPermission();
    this.setupConnectionListener();
    this.LoadDisclosure(); //Updates showDisclosure state if the user previously accepted
  }

  componentDidUpdate(prevProps, prevState) {
    if (!_.isEqual(prevState.myPosition, this.state.myPosition)) this._dataGet();
  }

  setupConnectionListener = async () => {
    try {
      let ci = await NetInfo.getConnectionInfo();
      this.handleConnectivityChange(ci);
    } catch (e) {}

    NetInfo.addEventListener(
     'connectionChange',
     this.handleConnectivityChange
    );
  }

  handleConnectivityChange(ci) {
    let state = 'none';
    try {
      switch (ci.type) {
        case 'wifi':
        case 'bluetooth':
        case 'ethernet':
          state = 'wifi';
          break;
        case 'cellular':
        case 'wimax':
          state = 'cellular';
          break;
      }
    } catch (e) {}
    this.setState({netInfo: state});
  }

  syncingOk() {
    if (this.state.netInfo === 'none') return false;
    return true;
  }

  componentWillUnmount() {
    this.cleanupLocation();
    NetInfo.removeEventListener(
      'connectionChange',
      this.handleConnectivityChange
    );
  }

  getEpoch() {
    return Math.floor(new Date().getTime())
  }

  doMarkerPress(node) {
    const { navigate } = this.props.navigation;

    this.setState({currentNode: node});

    if (node.multi_unit === true)
      navigate('ListMultiUnit', {refer: this, node: node});
    else
      this.setState({isKnockMenuVisible: true});
  }

  ucFirst(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getLastInteraction(marker) {
    return "Haven't visited";

    //str = this.ucFirst(last.status)+' '+timeAgo.format(new Date(last.updated));

    return str;
  }

  LoadDisclosure = async () => {
    try {
      const value = await storage.get(this.state.DisclosureKey);
      if (value !== null) {
        this.setState({showDisclosure : value});
      }
    } catch (error) {}
  }

  SaveDisclosure = async () => {
    try {
      await storage.set(this.state.DisclosureKey, "false");
    } catch (error) {}
  }

  timeFormat(epoch) {
    let date = new Date(epoch);
    return date.toLocaleDateString('en-us')+" "+date.toLocaleTimeString('en-us');
  }

  _dataGet = async (flag) => {
    const { myPosition } = this.state;
    let ret = {error: false};

    try {
      let res = await fetch('https://'+this.state.server+API_BASE_URI+'/data/get?formId='+this.state.form.id+'&longitude='+myPosition.longitude+'&latitude='+myPosition.latitude, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer '+await _getApiToken(),
          'Content-Type': 'application/json',
        },
      });

      let json = await res.json();

      if (res.status !== 200 || json.error === true) {
        if (json.msg) ret.msg = json.msg;
        throw "Sync error";
      }

      this.setState({markers: json, last_fetch: new Date().getTime()});
    } catch (e) {
      ret.error = true;
      console.warn('error: '+e);
    }

    return ret;
  }

  getPinColor(marker) {
    if (marker.units.length) return "cyan";

    // no interactions
    return "#8b4513";

/*
    switch (nodes[0].status) {
      case 'home': return "green";
      case 'not home': return "yellow";
      case 'not interested': return "red";
    }
*/

    return "#8b4513";
  }

  _canvassGuidelinesUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/HelloVoter/blob/master/docs/Canvassing-Guidelines.md";
    return Linking.openURL(url).catch(() => null);
  }

  render() {
    const { navigate } = this.props.navigation;
    const {
      showDisclosure, myPosition, myNodes, locationAccess, serviceError, form, user,
      loading, region,
    } = this.state;

    if (showDisclosure === "true") {
      return (
        <ScrollView style={{flex: 1, backgroundColor: 'white'}}>
          <View style={styles.content}>
            <Text style={{margin: 15, fontSize: 18, color: 'dimgray'}}>
              Our Voice provides this canvassing tool for free for you to use for your own purposes. You will be talking
              to real people and asking real questions about policy positions that matter, and hopefully also collaborating
              with other canvassers. Together, we can crowd source the answers to how our country thinks outside of
              partisan politics.
            </Text>

            <View style={{margin: 15}}>
              <Text style={{fontSize: 18, color: 'dimgray'}}>
                By using this tool you acknowledge that you are acting on your own behalf, do not represent Our Voice USA
                or its affiliates, and have read our <Text style={{fontSize: 18, fontWeight: 'bold', color: 'blue'}} onPress={() => {this._canvassGuidelinesUrlHandler()}}>
                canvassing guidelines</Text>. Please be courteous to those you meet.
              </Text>
            </View>

                <View style={{margin: 5, flexDirection: 'row'}}>
                  <Icon.Button
                    name="check-circle"
                    backgroundColor="#d7d7d7"
                    color="#000000"
                    onPress={() => {
                      this.setState({ showDisclosure: "false"}); //Hide disclosure
                      this.SaveDisclosure(); //Save the disclosures acceptance
                    }}
                    {...iconStyles}>
                    I understand & agree to the guidelines
                  </Icon.Button>
                </View>

                <View style={{margin: 5, flexDirection: 'row'}}>
                  <Icon.Button
                    name="ban"
                    backgroundColor="#d7d7d7"
                    color="#000000"
                    onPress={() => {this.props.navigation.dispatch(NavigationActions.back())}}
                    {...iconStyles}>
                    I do not agree to this! Take me back!
                  </Icon.Button>
                </View>

          </View>
        </ScrollView>
      );
    }

    var nomap_content = [];

    if (locationAccess === false) {
      nomap_content.push(
        <View key={1} style={styles.content}>
          <Text>Unable to determine your location.</Text>
          <Text>To view the map, enable location permissions in your device settings.</Text>
        </View>
      );
    } else if (serviceError === true) {
      nomap_content.push(
        <View key={1} style={styles.content}>
          <Text>Unable to load location services from your device.</Text>
        </View>
      );
    } else if (myPosition.latitude === null || myPosition.longitude === null) {
      nomap_content.push(
        <View key={1} style={styles.content}>
          <Text>Waiting on location data from your device...</Text>
          <ActivityIndicator />
        </View>
      );
    }

    let geofence = [];
    if (this.state.geofence) {
      geofence = geojson2polygons(this.state.geofence, true);
    }

    return (
      <View style={styles.container}>

        {nomap_content.length &&
          <View>
            { nomap_content }
          </View>
        ||
        <MapView
          ref={component => this.map = component}
          initialRegion={{latitude: myPosition.latitude, longitude: myPosition.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta}}
          onMapReady={() => {
            let latitudeDelta = region.latitudeDelta;
            let longitudeDelta = region.longitudeDelta;

            this.map.animateToRegion({
              latitude: myPosition.latitude,
              longitude: myPosition.longitude,
              latitudeDelta: latitudeDelta,
              longitudeDelta: longitudeDelta,
            });
          }}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          showsUserLocation={true}
          followsUserLocation={false}
          keyboardShouldPersistTaps={true}
          {...this.props}>
          {geofence.map((polygon, idx) => <MapView.Polygon key={idx} coordinates={polygon} strokeWidth={2} fillColor="rgba(0,0,0,0)" />)}
          {this.state.markers.map((marker) => {
            return (
              <MapView.Marker
                key={marker.address.id}
                coordinate={{longitude: marker.address.longitude, latitude: marker.address.latitude}}
                pinColor={this.getPinColor(marker)}>
                <MapView.Callout onPress={() => this.doMarkerPress(marker)}>
                  <View style={{backgroundColor: '#FFFFFF', padding: 5, width: 175}}>
                    <Text style={{fontWeight: 'bold'}}>{marker.address.street} {marker.address.city} {marker.address.state} {marker.address.zip}</Text>
                    <Text>{(marker.units.length ? 'Multi-unit address' : this.getLastInteraction(marker))}</Text>
                  </View>
                </MapView.Callout>
              </MapView.Marker>
          )})}
        </MapView>
        }

        <Modal
          open={this.state.isKnockMenuVisible}
          modalStyle={{width: 335, height: 350, backgroundColor: "transparent",
            position: 'absolute', top: (Platform.OS === 'android'?0:100), left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({isKnockMenuVisible: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <KnockPage refer={this} funcs={this} />
        </Modal>

      </View>
    );
  }
}

const iconStyles = {
  justifyContent: 'center',
  borderRadius: 10,
  padding: 10,
};

const displayNone = {
  height: 0,
  maxHeight: 0,
  opacity: 0,
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: '#ffffff', width: 65, height: 65, borderRadius: 65,
    borderWidth: 2, borderColor: '#000000',
    alignItems: 'center', justifyContent: 'center', margin: 2.5,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  latlng: {
    width: 200,
    alignItems: 'stretch',
  },
  button: {
    width: 300,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    backgroundColor: '#d7d7d7',
  },
  buttonText: {
    fontSize: 18,
    color: 'white',
    alignSelf: 'center'
  },
  addButton: {
    height: 36,
    backgroundColor: '#48BBEC',
    borderColor: '#48BBEC',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'stretch',
    justifyContent: 'center'
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: 'transparent',
  },
});
