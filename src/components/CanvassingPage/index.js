import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Alert,
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
  Keyboard,
} from 'react-native';

import OVComponent from '../OVComponent';

import Accordion from 'react-native-collapsible/Accordion';
import { BottomNavigation } from 'react-native-material-ui';
import { NavigationActions } from 'react-navigation';
import storage from 'react-native-storage-wrapper';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import { Divider, API_BASE_URI, _doGeocode, _getApiToken, getEpoch } from '../../common';
import KnockPage from '../KnockPage';
import CanvassingSettingsPage from '../CanvassingSettingsPage';
import Modal from 'react-native-simple-modal';
import md5 from 'md5';
import { debounce } from 'throttle-debounce';
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import t from 'tcomb-form-native';
import _ from 'lodash';
import {deepCopy, geojson2polygons, ingeojson} from 'ourvoiceusa-sdk-js';

TimeAgo.locale(en);

var Form = t.form.Form;

var formStreet = t.struct({
  'street': t.String,
}); 
var formCity = t.struct({
  'city': t.String,
}); 
var formState = t.struct({
  'state': t.String,
  'zip': t.String,
}); 
  
const formStyleRow = _.cloneDeep(t.form.Form.stylesheet);
formStyleRow.fieldset = {
  flexDirection: 'row'
};  
formStyleRow.formGroup.normal.flex = 1;
formStyleRow.formGroup.error.flex = 1;

const formOptRow = {
  stylesheet: formStyleRow,
};

function bystreet(a,b) {
  let na = parseInt(a.address.street.replace(/(\d+) .*/, '$1'));
  let nb = parseInt(b.address.street.replace(/(\d+) .*/, '$1'));

  if ( na < nb )
    return -1;
  if ( na > nb )
    return 1;
  return 0;
}

export default class App extends OVComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
      server: props.navigation.state.params.server,
      active: 'map',
      listview: {},
      listview_order: [],
      activeCity: [0],
      activeStreet: [],
      last_fetch: 0,
      loading: false,
      fetching: false,
      netInfo: 'none',
      serviceError: null,
      myPosition: {latitude: null, longitude: null},
      lastFetchPosition: {latitude: null, longitude: null},
      region: {latitudeDelta: 0.004, longitudeDelta: 0.004},
      markers: [],
      fAddress: {},
      pAddress: {},
      DisclosureKey : 'OV_DISCLOUSER',
      settingsStorageKey: 'OV_CANVASS_SETTINGS',
      canvassSettings: {},
      isModalVisible: false,
      isKnockMenuVisible: false,
      showDisclosure: "true",
      form: props.navigation.state.params.form,
      user: props.navigation.state.params.user,
      turfs: props.navigation.state.params.form.turfs,
      retry_queue: [],
    };

    if (this.state.form.add_new) this.add_new = true;

    this.onChange = this.onChange.bind(this);
    this.onRegionChange = this.onRegionChange.bind(this);
    this.handleConnectivityChange = this.handleConnectivityChange.bind(this);

    this._dataGet = debounce(500, this._dataFetch)

    // confirm exit, and reload forms when they do
    this.goBack = this.props.navigation.goBack;
    this.props.navigation.goBack = () => {
      Alert.alert(
        'Exit Canvassing',
        'Are you sure you wish to exit the canvassing?',
        [
          {text: 'Yes', onPress: () => {
            this.state.refer._loadForms();
            this.goBack();
          }},
          {text: 'No'},
        ], { cancelable: false }
      );
    };
  }

  componentDidMount() {
    this._getCanvassSettings();
    this.requestLocationPermission();
    this.setupConnectionListener();
    this.LoadDisclosure(); //Updates showDisclosure state if the user previously accepted
    this.loadRetryQueue();
  }

  onRegionChange(region) {
    this._dataGet(region);
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

    if (state === 'wifi' || state === 'cellular') this.doRetry();
  }

  _getCanvassSettings = async () => {
    let canvassSettings = {};
    try {
      const value = await storage.get(this.state.settingsStorageKey);
      if (value !== null) {
        canvassSettings = JSON.parse(value);
      }
    } catch (e) {
      console.warn(e);
      return;
    }

    if (!canvassSettings.limit) canvassSettings.limit = '100';

    this.setState({ canvassSettings });
  }

  _setCanvassSettings = async (canvassSettings) => {
    const { form, lastFetchPosition } = this.state;

    try {
      if (!canvassSettings.limit) canvassSettings.limit = '100';
      let str = JSON.stringify(canvassSettings);
      await storage.set(this.state.settingsStorageKey, str);
      this.setState({canvassSettings}, () => this._dataGet(lastFetchPosition, true));
    } catch (e) {}

  }

  componentDidUpdate(prevProps, prevState) {
    const { active, canvassSettings } = this.state;

    if (prevState.active !== active) {
      // close any open modals
      this.setState({isModalVisible: false, isKnockMenuVisible: false});

      // reload filters, etc
      if (prevState.active === 'settings') this._setCanvassSettings(canvassSettings);
    }
  }

  componentWillUnmount() {
    this.cleanupLocation();
    NetInfo.removeEventListener(
      'connectionChange',
      this.handleConnectivityChange
    );
  }

  addOk = () => {
    if (this.state.canvassSettings.filter_pins) return false;
    if (this.state.canvassSettings.filter_visited) return false;
    return true;

  }

  showConfirmAddress = () => {
    const { myPosition } = this.state;

    if (!this.addOk()) {
      Alert.alert('Active Filter', 'You cannot add a new address while a filter is active.', [{text: 'OK'}], { cancelable: false });
      return;
    }

    if (this.state.netInfo === 'none') {
      this.setState({ isModalVisible: true });
      return;
    }

    if (myPosition.latitude !== null && myPosition.longitude !== null) {
      if (this.state.turfs && this.state.turfs.length) {
        let flag = false;
        this.state.turfs.forEach(t => {
          if (ingeojson(t, myPosition.longitude, myPosition.latitude)) flag = true;
        });
        if (!flag) {
          Alert.alert('Outside Boundary', 'You are outside the turf boundary for this canvassing form.', [{text: 'OK'}], { cancelable: false });
          return;
        }
      }
    }

    this.setState({
      loading: true,
      isModalVisible: true,
    });
  
    setTimeout(async () => {
      try {
        if (this.state.locationAccess === false) throw "location access denied";
  
        let res = await _doGeocode(myPosition.longitude, myPosition.latitude);
  
        if (!res.error) {
          let arr = res.address.split(", ");
          let country = arr[arr.length-1]; // unused
          let state_zip = arr[arr.length-2];
          let fAddress = {
            state: (state_zip?state_zip.split(" ")[0]:null),
            zip: (state_zip?state_zip.split(" ")[1]:null),
            city: arr[arr.length-3],
            street: arr[arr.length-4],
          };

          this.setState({fAddress});
        }
      } catch (error) {}
      this.setState({loading: false})
    }, 550);
  }

  onChange(fAddress) {
    this.setState({fAddress});
  }

  getEpoch() {
    return Math.floor(new Date().getTime())
  }

  doConfirmAddress = async () => {
    const { myPosition, form, markers } = this.state;
    
    let jsonStreet = this.refs.formStreet.getValue();
    let jsonCity = this.refs.formCity.getValue();
    let jsonState = this.refs.formState.getValue();
    
    if (jsonStreet === null || jsonCity === null || jsonState === null) return;

    try {
      await this.map.animateToCoordinate(myPosition, 500)
    } catch (error) {}
    
    let epoch = this.getEpoch();
    let fAddress = {
      street: jsonStreet.street.trim(),
      city: jsonCity.city.trim(),
      state: jsonState.state.trim(),
      zip: jsonState.zip.trim(),
    };

    // search for dupes
    let marker;
    markers.forEach(m => {
      // change nulls to empty string
      ["street", "city", "state", "zip"].forEach(i => {if (!m.address[i]) m.address[i] = "";});

      if (m.address.street.toLowerCase() === fAddress.street.toLowerCase() &&
          m.address.city.toLowerCase() === fAddress.city.toLowerCase() &&
          m.address.state.toLowerCase() === fAddress.state.toLowerCase() &&
          m.address.zip.substring(0, 5) === fAddress.zip.substring(0, 5)) marker = m;
    });

    if (!marker) {
      marker = {
        people: [],
        units: [],
        address: {
          id: md5(fAddress.street.toLowerCase()+fAddress.city.toLowerCase()+fAddress.state.toLowerCase()+fAddress.zip.substring(0, 5)),
          longitude: myPosition.longitude,
          latitude: myPosition.latitude,
          street: fAddress.street,
          city: fAddress.city,
          state: fAddress.state,
          zip: fAddress.zip,
        },
      };

      let input = {
        deviceId: DeviceInfo.getUniqueID(),
        formId: form.id,
        timestamp: getEpoch(),
        longitude: myPosition.longitude,
        latitude: myPosition.latitude,
        street: marker.address.street,
        city: marker.address.city,
        state: marker.address.state,
        zip: marker.address.zip,
      };

      this.sendData('/address/add/location', input);

      markers.push(marker);
    }

    this.setState({ markers, fAddress, pAddress: fAddress, isModalVisible: false });
    this.doMarkerPress(marker); 
  }

  doMarkerPress = (marker) => {
    const { navigate } = this.props.navigation;
    const { form } = this.state;

    this.currentMarker = marker;

    if (marker.units.length)
      navigate('ListMultiUnit', {refer: this, form: form});
    else
      this.setState({isKnockMenuVisible: true});
  }

  getCurrentMarker() { return this.currentMarker; }

  ucFirst(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getLastVisitObj(place) {
    if (!place.visits || place.visits.length === 0)
      return {status:-1};

    let latest = {end:0};

    for (let i in place.visits) {
      if (place.visits[i].end > latest.end) latest = place.visits[i];
    }

    return latest;
  }

  getLastVisit(place) {
    let str;
    let v = this.getLastVisitObj(place);

    switch (v.status) {
      case 0: str = "Not home"; break;
      case 1: str = "Home"; break;
      case 2: str = "Not interested"; break;
      default: str = "Haven't visited"; break;
    }

    return str+(v.end?" "+new TimeAgo('en-US').format(v.end):'');
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

  updateLocalMarker(place, input) {
    // add interaction locally so app updates color
    if (!place.visits) place.visits = [];
    place.visits.push(input);
    this.forceUpdate();
  }

  _dataFetch = async (pos, flag) => {
    const { canvassSettings, myPosition, lastFetchPosition } = this.state;
    let ret = {error: false};

    if (!pos) pos = myPosition;

    if (!pos.longitude || !pos.latitude) return;

    this.setState({fetching: true});

    try {
      let res = await fetch(
        'https://'+this.state.server+API_BASE_URI+'/people/get/byposition?formId='+this.state.form.id+
        '&longitude='+pos.longitude+'&latitude='+pos.latitude+
        '&limit='+(canvassSettings.limit?canvassSettings.limit:100)+
        (canvassSettings.filter_visited?'&filter_visited=home':'')+
        (canvassSettings.filter_pins&&canvassSettings.filter_key?'&filter_key='+canvassSettings.filter_key+'&filter_val='+canvassSettings.filter_val:''),
      {
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

      let listview = {};
      let listview_order = [];
      let cities = [];
      let streets = [];

      // gather unique cities & streets
      json.forEach((marker) => {
        let street = marker.address.street.replace(/\d+ /, '');

        if (!listview[street]) {
          listview[street] = [];
          listview_order.push(street);
        }

        listview[street].push(marker);
      });

      Object.keys(listview).forEach((street) => listview[street].sort(bystreet));

      this.setState({lastFetchPosition: pos, markers: json, listview, listview_order, last_fetch: getEpoch()});
    } catch (e) {
      ret.error = true;
      this.triggerNetworkWarning();
    }

    this.setState({fetching: false});

    return ret;
  }

  sendVisit(id, place, unit, person, start, json) {
    const { form, myPosition } = this.state;
    let attrs = [];

    // convert object key/value to an array of id/value
    let ids = Object.keys(json);
    for (let i in ids) {
      attrs.push({
        id: ids[i],
        value: (json[ids[i]]?json[ids[i]]:""),
      });
    }

    let input = {
      deviceId: DeviceInfo.getUniqueID(),
      addressId: id,
      formId: form.id,
      status: 1,
      start: start,
      end: getEpoch(),
      longitude: myPosition.longitude,
      latitude: myPosition.latitude,
      personId: person.id,
      attrs: attrs,
    };

    if (unit) input.unit = unit.name;

    this.updateLocalMarker(place, input);

    if (person.new) place.people.push(person);
    
    this.sendData('/people/visit/'+(person.new?'add':'update'), input);
  }

  sendStatus(status, id, place, unit, personId) {
    const { form, myPosition } = this.state;

    let now = getEpoch();

    let input = {
      deviceId: DeviceInfo.getUniqueID(),
      addressId: id,
      formId: form.id,
      status: status,
      start: now,
      end: now,
      longitude: myPosition.longitude,
      latitude: myPosition.latitude,
    };

    if (unit) input.unit = unit.name;
    if (personId) input.personId = personId;

    this.updateLocalMarker(place, input);

    this.sendData('/people/visit/update', input);
  }

  sendData = async (uri, input) => {
    try {
      let res = await fetch('https://'+this.state.server+API_BASE_URI+uri, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+await _getApiToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (res.status !== 200) {
        throw "sendData error";
      }

    } catch (e) {
      this.triggerNetworkWarning();
      await this.queueRetry(uri, input);
    }
  }

  queueRetry = async (uri, input) => {
    let { retry_queue } = this.state;
    retry_queue.push({uri: uri, input: input});
    this.setState({retry_queue});
    try {
      await storage.set('OV_RETRY', JSON.stringify(retry_queue));
    } catch(e) {
      console.warn(e);
    }
  }

  doRetry = async () => {
    let queue = deepCopy(this.state.retry_queue);

    if (this.state.retry_running) return;
    this.setState({retry_running: true, retry_queue: []});

    for (let i in queue) {
      let input = queue[i].input;
      let uri = queue[i].uri;
      await this.sendData(uri, input);
    }

    try {
      await storage.del('OV_RETRY');
      this._dataGet();
    } catch (e) {
      console.warn(e);
    }

    this.setState({retry_running: false});
  }

  loadRetryQueue = async () => {
    try {
      const value = await storage.get('OV_RETRY');
      if (value !== null)
        this.setState({retry_queue: JSON.parse(value)}, () => this.doRetry());
    } catch(e) {
      console.warn(e);
    }
  }

  notHome = async (id, place, unit) => {
    this.sendStatus(0, id, place, unit);
  }

  notInterested = async (id, place, unit) => {
    this.sendStatus(2, id, place, unit);
  }

  personMoved = async (id, place, unit, personId) => {
    this.sendStatus(3, id, place, unit, personId);
  }

  triggerNetworkWarning() {
    // TODO: bar that appears at the top and a tap retries
  }

  getPinColor(place) {
    if (place.units && place.units.length) return "cyan";

    let str;
    let v = this.getLastVisitObj(place);

    switch (v.status) {
      case 0: return 'yellow';
      case 1: return 'green';
      case 2: return 'red';
      default: return '#8b4513';
    }
  }

  _canvassGuidelinesUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/HelloVoter/blob/master/docs/Canvassing-Guidelines.md";
    return Linking.openURL(url).catch(() => null);
  }

  acstreet = (street) => this.state.listview[street].map((marker, idx) => {
    let color = this.getPinColor(marker);
    let icon = (color === "red" ? "ban" : "home");

    return (
      <View key={idx} style={{padding: 10, paddingTop: 0}}>
        <TouchableOpacity
          style={{flexDirection: 'row', alignItems: 'center'}}
          onPress={() => this.doMarkerPress(marker)}>
          <Icon name={icon} size={40} color={color} style={{margin: 5}} />
          <Text>{marker.address.street} - {this.getLastVisit(marker)}</Text>
          </TouchableOpacity>
          <Divider />
        </View>
      );
    }
  )

  acrh = (street, idx) => (
    <View>
      <View style={{flex: 1, flexDirection: 'row'}}>
        <Icon
          style={{margin: 20, marginRight: 10}}
          size={20}
          name={(parseInt(this.state.activeStreet)===idx?"minus-circle":"plus-circle")}
          backgroundColor="#d7d7d7"
          color="black"
        />
        <Text style={{alignSelf: 'center', margin: 20, marginLeft: 10}}>{street} ({this.state.listview[street].length})</Text>
      </View>
      <Divider />
    </View>
  )

  acoc = (activeStreet) => this.setState({activeStreet})

  render() {
    const { navigate } = this.props.navigation;
    const {
      showDisclosure, myPosition, myNodes, locationAccess, serviceError, form, user,
      loading, region, active, fetching
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
    if (this.state.turfs) {
      for (let i in this.state.turfs)
        geofence = geofence.concat(geojson2polygons(this.state.turfs[i], true));
    }

    return (
      <View style={{flex: 1}}>
        <ScrollView style={{flex: 1, backgroundColor: '#FFF'}}>
        {active==='list'&&
          <View>
          {this.state.listview_order.length&&
            <Accordion
              activeSections={this.state.activeStreet}
              sections={this.state.listview_order}
              renderSectionTitle={() => null}
              renderHeader={this.acrh}
              renderContent={this.acstreet}
              onChange={this.acoc}
            />
          ||
            <Text>No address data for this area. Try widening your view on the map or adjusting your filter settings.</Text>
          }
          </View>
        }
        {active==='history'&&
          <Text>History goes here...</Text>
        }
        {active==='settings'&&
          <CanvassingSettingsPage refer={this} form={form} />
        }
        </ScrollView>

        {nomap_content.length &&
          <View>
            { nomap_content }
          </View>
        ||
        <MapView
          ref={component => this.map = component}
          initialRegion={{latitude: myPosition.latitude, longitude: myPosition.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta}}
          onMapReady={() => this.map.animateToRegion({
            latitude: myPosition.latitude,
            longitude: myPosition.longitude,
            latitudeDelta: region.latitudeDelta,
            longitudeDelta: region.longitudeDelta,
          })}
          provider={PROVIDER_GOOGLE}
          style={(active==='map'?styles.map:null)}
          showsUserLocation={true}
          followsUserLocation={false}
          keyboardShouldPersistTaps={true}
          onRegionChangeComplete={this.onRegionChange}
          showsIndoors={false}
          showsTraffic={false}
          {...this.props}>
          {geofence.map((polygon, idx) => <MapView.Polyline key={idx} coordinates={polygon} strokeWidth={2} />)}
          {this.state.markers.map((marker) => (
              <MapView.Marker
                key={marker.address.id}
                coordinate={{longitude: marker.address.longitude, latitude: marker.address.latitude}}
                pinColor={this.getPinColor(marker)}>
                <MapView.Callout onPress={() => this.doMarkerPress(marker)}>
                  <View style={{backgroundColor: '#FFFFFF', padding: 5, width: 175}}>
                    <Text style={{fontWeight: 'bold'}}>
                      {marker.address.street}, {marker.address.city}, {marker.address.state}, {marker.address.zip}
                    </Text>
                    <Text>{(marker.units.length ? 'Multi-unit address' : this.getLastVisit(marker))}</Text>
                  </View>
                </MapView.Callout>
              </MapView.Marker>
          ))}
        </MapView>
        }

        {fetching&&
        <View style={{position: 'absolute', right: 0, ...styles.iconContainer}}>
          <ActivityIndicator size="large" />
        </View>
        }

        {active==='map'&&
        <View style={{alignItems: 'center', justifyContent: 'flex-end'}}>
        <View style={styles.buttonContainer}>

          {this.add_new &&
          <TouchableOpacity style={styles.iconContainer}
            onPress={this.showConfirmAddress}>
            <Icon
              name="map-marker"
              testID="map-marker"
              size={50}
              color="#8b4513"
              {...iconStyles} />
          </TouchableOpacity>
          }

          {nomap_content.length == 0 &&
          <TouchableOpacity style={styles.iconContainer}
            onPress={() => this.map.animateToCoordinate(myPosition, 1000)}>
            <Icon
              name="location-arrow"
              size={50}
              color="#0084b4"
              {...iconStyles} />
          </TouchableOpacity>
          }
        </View>
        </View>
        }

        <Modal
          open={this.state.isModalVisible}
          modalStyle={{width: 350, height: 400, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({isModalVisible: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <View style={{flexDirection: 'column'}}>
            <View style={{width: 325, backgroundColor: 'white', marginTop: 5, borderRadius: 15, padding: 10, alignSelf: 'flex-start'}}>
              {loading &&
              <View>
                <Text style={{color: 'blue', fontWeight: 'bold', fontSize: 15}}>Loading Address</Text>
                <ActivityIndicator size="large" />
              </View>
              ||
              <View>
                <View style={{flexDirection: 'row'}}>
                  <Text style={{color: 'blue', fontWeight: 'bold', fontSize: 15}}>Confirm the Address</Text>
                  <View style={{flexDirection: 'row'}}>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#d7d7d7', padding: 10, borderRadius: 20, marginLeft: 5,
                        ...((this.state.pAddress.street && this.state.pAddress.street !== this.state.fAddress.street) ? {} : displayNone)
                      }}
                      onPress={() => {this.setState({fAddress: this.state.pAddress})}}>
                      <Text style={{textAlign: 'center'}}>Use Previous</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#d7d7d7', padding: 10, borderRadius: 20, marginLeft: 5,
                        ...(this.state.netInfo === 'none' ? displayNone : {})
                      }}
                      onPress={this.showConfirmAddress}>
                      <Text style={{textAlign: 'center'}}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Form
                 ref="formStreet"
                 type={formStreet}
                 onChange={this.onChange}
                 value={this.state.fAddress}
                />
                <Form
                 ref="formCity"
                 type={formCity}
                 onChange={this.onChange}
                 options={formOptRow}
                 value={this.state.fAddress}
                />
                <Form
                 ref="formState"
                 type={formState}
                 onChange={this.onChange}
                 options={formOptRow}
                 value={this.state.fAddress}
                />
                <TouchableHighlight style={styles.addButton} onPress={this.doConfirmAddress} underlayColor='#99d9f4'>
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableHighlight>
              </View>
              }
            </View>
          </View>
        </Modal>

        <Modal
          open={this.state.isKnockMenuVisible}
          modalStyle={{width: 335, height: 350, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({isKnockMenuVisible: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <KnockPage refer={this} funcs={this} marker={this.currentMarker} form={form} />
        </Modal>

        <BottomNavigation active={this.state.active} hidden={false} >
          <BottomNavigation.Action
            key="map"
            icon="map"
            label="Map View"
            onPress={() => this.setState({active: 'map'})}
          />
          <BottomNavigation.Action
            key="list"
            icon="bookmark"
            label="List View"
            onPress={() => this.setState({active: 'list'})}
          />
          <BottomNavigation.Action
            key="history"
            icon="today"
            label="History"
            onPress={() => this.setState({active: 'history'})}
          />
          <BottomNavigation.Action
            key="settings"
            icon="settings"
            label="Settings"
            onPress={() => this.setState({active: 'settings'})}
          />
        </BottomNavigation>

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
    marginVertical: 5,
    backgroundColor: 'transparent',
  },
});
