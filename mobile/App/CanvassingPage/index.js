import React from 'react';

import {
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';

import { Container, Content, Footer, FooterTab, Text, H3, Button, Spinner } from 'native-base';

import {
  DINFO, api_base_uri, _doGeocode, _getApiToken, getEpoch, openURL, STORAGE_KEY_SETTINGS,
} from '../common';

import LocationComponent from '../LocationComponent';
import TermsDisclosure, { loadDisclosure } from './TermsDisclosure';
import ListTab from './ListTab';
import TurfTab from './TurfTab';
import SettingsTab from './SettingsTab';

import storage from 'react-native-storage-wrapper';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import RNGooglePlaces from 'react-native-google-places';
import { ConfirmDialog, Dialog } from 'react-native-simple-dialogs';
import md5 from 'md5';
import { debounce } from 'throttle-debounce';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import t from 'tcomb-form-native';
import _ from 'lodash';

import {deepCopy, geojson2polygons, ingeojson} from 'ourvoiceusa-sdk-js';

TimeAgo.addLocale(en);

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
var unitForm = t.struct({
  'unit': t.String,
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

export default class App extends LocationComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
      server: props.navigation.state.params.server,
      form: props.navigation.state.params.form,
      orgId: props.navigation.state.params.orgId,
      turfs: props.navigation.state.params.form.turfs,
      active: 'map',
      segmentList: 'streets',
      segmentTurf: 'list',
      selectedTurf: {},
      listview: {},
      listview_order: [],
      last_fetch: 0,
      mapCenter: {},
      loading: false,
      fetching: false,
      fetchingHistory: false,
      fetchingTurfStats: false,
      checkHistory: true,
      history: [],
      turfStats: {},
      netInfo: 'none',
      serviceError: null,
      deviceError: null,
      myPosition: {latitude: null, longitude: null},
      lastFetchPosition: {latitude: null, longitude: null},
      region: {latitudeDelta: 0.004, longitudeDelta: 0.004},
      markers: [],
      people: [],
      peopleSearch: null,
      onlyPhonePeople: false,
      searchPins: [],
      fAddress: {},
      pAddress: {},
      fUnit: {},
      canvassSettings: {},
      newAddressDialog: false,
      newUnitDialog: false,
      showDisclosure: true,
      retry_queue: [],
      confirmDialog: false,
    };

    if (this.state.form.add_new) this.add_new = true;

    this.onChange = this.onChange.bind(this);
    this.onUnitChange = this.onUnitChange.bind(this);
    this.onRegionChange = this.onRegionChange.bind(this);
    this.handleConnectivityChange = this.handleConnectivityChange.bind(this);

    this._dataGet = debounce(500, this._dataFetch)
    this.peopleSearchDebounce = debounce(500, this.peopleSearch);

    // confirm exit, and reload forms when they do
    this.goBack = this.props.navigation.goBack;
    this.props.navigation.goBack = () => {
      this.alert(
        "Exit Canvassing",
        "Are you sure you wish to exit the canvassing tool?",
        {
          title: "Yes",
          onPress: () => {
            this.setState({confirmDialog: false});
            this.state.refer._loadForms();
            this.goBack();
          },
        },
        {
          title: "No",
          onPress: () => this.setState({confirmDialog: false}),
        }
      );
    };
  }

  componentDidMount() {
    DINFO().then(i => this.setState({UniqueID: i.UniqueID})).catch(() => this.setState({deviceError: true}));
    loadDisclosure(this);
    this._getCanvassSettings();
    this.requestLocationPermission();
    this.setupConnectionListener();
    this.loadRetryQueue();
  }

  onRegionChange(region) {
    this.setState({mapCenter: region})
    if (this.state.canvassSettings.chill_mode !== true) this._dataGet(region);
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
    const { form } = this.state;

    let canvassSettings = {};
    try {
      const value = await storage.get(STORAGE_KEY_SETTINGS);
      if (value !== null) {
        canvassSettings = JSON.parse(value);
      }
    } catch (e) {
      console.warn(e);
      return;
    }

    // set some defaults
    if (!canvassSettings.limit) canvassSettings.limit = '100';
    if (form.default_filters && !canvassSettings.filters) {
      canvassSettings.filter_pins = true;
      canvassSettings.filters = deepCopy(form.default_filters);
    }

    this.setState({ canvassSettings });
  }

  _setCanvassSettings = async (canvassSettings) => {
    const { form, lastFetchPosition } = this.state;

    try {
      if (!canvassSettings.limit) canvassSettings.limit = '100';
      let str = JSON.stringify(canvassSettings);
      await storage.set(STORAGE_KEY_SETTINGS, str);
      this.setState({canvassSettings}, () => this._dataGet(lastFetchPosition, true));
    } catch (e) {}

  }

  componentDidUpdate(prevProps, prevState) {
    const { active, segmentList, canvassSettings, checkHistory } = this.state;

    if (prevState.active !== active) {
      // close any open modals
      this.setState({newAddressDialog: false, newUnitDialog: false});

      // reload filters, etc
      if (prevState.active === 'settings') this._setCanvassSettings(canvassSettings);
    }

    if (prevState.segmentList !== segmentList) {
      // poll history if needed
      if (segmentList === 'history' && checkHistory) this._pollHistory();
    }
  }

  componentWillUnmount() {
    this.cleanupLocation();
    NetInfo.removeEventListener(
      'connectionChange',
      this.handleConnectivityChange
    );
  }

  dropSearchPin(place) {
    let { searchPins } = this.state;
    searchPins.push(place);
    this.setState({searchPins});
  }

  _pollHistory = async () => {

    this.setState({fetchingHistory: true});

    try {
      let https = true;
      if (this.state.server.match(/:8080/)) https = false;
      let res = await fetch(
        'http'+(https?'s':'')+'://'+this.state.server+api_base_uri(this.state.orgId)+'/volunteer/visit/history?formId='+this.state.form.id,
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

      this.setState({history: json, checkHistory: false});
    } catch (e) {
      this.triggerNetworkWarning();
    }

    this.setState({fetchingHistory: false});
  }

  addOk = () => {
    if (this.state.canvassSettings.filter_pins) return false;
    if (this.state.canvassSettings.filter_visited) return false;
    return true;
  }

  showConfirmAddress = (pos) => {
    const { myPosition } = this.state;

    if (!this.addOk()) return this.alert("Active Filter", "You cannot add a new address while a filter is active.");

    if (this.state.netInfo === 'none') {
      this.setState({ newAddressDialog: true });
      return;
    }

    if (!pos) pos = myPosition;

    if (pos.latitude !== null && pos.longitude !== null) {
      if (this.state.turfs && this.state.turfs.length) {
        let flag = false;
        this.state.turfs.forEach(t => {
          if (ingeojson(t, pos.longitude, pos.latitude)) flag = true;
        });
        if (!flag) return this.alert("Outside Boundary", "You are outside the turf boundary for this canvassing form.");
      }
    }

    this.setState({
      loading: true,
      newAddressDialog: true,
    });

    setTimeout(async () => {
      try {
        if (this.state.locationAccess === false) throw "location access denied";

        let res = await _doGeocode(pos.longitude, pos.latitude);

        if (!res.error) {
          let arr = res.address.split(", ");
          let country = arr[arr.length-1]; // unused
          let state_zip = arr[arr.length-2];
          let fAddress = {
            state: (state_zip?state_zip.split(" ")[0]:null),
            zip: (state_zip?state_zip.split(" ")[1]:null),
            city: arr[arr.length-3],
            street: arr[arr.length-4],
            longitude: pos.longitude,
            latitude: pos.latitude,
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

  onUnitChange(fUnit) {
    this.setState({fUnit});
  }

  doConfirmAddress = async () => {
    const { myPosition, form, markers, UniqueID } = this.state;
    let { fAddress } = this.state;

    let jsonStreet = this.refs.formStreet.getValue();
    let jsonCity = this.refs.formCity.getValue();
    let jsonState = this.refs.formState.getValue();

    if (jsonStreet === null || jsonCity === null || jsonState === null) return;

    try {
      await this.map.animateToCoordinate({longitude: fAddress.longitude, latitude: fAddress.latitude}, 500)
    } catch (error) {}

    let epoch = getEpoch();

    fAddress.street = jsonStreet.street.trim();
    fAddress.city = jsonCity.city.trim();
    fAddress.state = jsonState.state.trim();
    fAddress.zip = jsonState.zip.trim();

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
          longitude: fAddress.longitude,
          latitude: fAddress.latitude,
          street: fAddress.street,
          city: fAddress.city,
          state: fAddress.state,
          zip: fAddress.zip,
        },
      };

      let input = {
        deviceId: UniqueID,
        formId: form.id,
        timestamp: getEpoch(),
        longitude: fAddress.longitude,
        latitude: fAddress.latitude,
        street: marker.address.street,
        city: marker.address.city,
        state: marker.address.state,
        zip: marker.address.zip,
      };

      this.sendData('/address/add/location', input);

      markers.push(marker);
    }

    this.setState({ markers, fAddress, pAddress: fAddress, searchPins: [], newAddressDialog: false });
    this.doMarkerPress(marker);
  }

  doMarkerPress = (marker) => {
    const { navigate } = this.props.navigation;
    const { form } = this.state;

    this.setState({currentMarker: marker});

    this.setState({active: 'list', segmentList: 'residence'});
  }

  getLastVisitObj(place) {
    let latest = {status:-1,end:0};

    if (!place.visits || place.visits.length === 0)
      return latest;

    for (let i in place.visits) {
      if (place.visits[i].status !== 3 && place.visits[i].end > latest.end) latest = place.visits[i];
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

  updateLocalMarker(place, input) {
    // add interaction locally so app updates color
    if (!place.visits) place.visits = [];
    place.visits.push(input);
    this.forceUpdate();
  }

  _loadTurfStats = async () => {
    const { selectedTurf } = this.state;

    return; // TODO: enable turf stats

    this.setState({active: 'turf', segmentTurf: 'stats', fetchingTurfStats: true});

    try {
      let https = true;
      if (this.state.server.match(/:8080/)) https = false;
      let res = await fetch(
        'http'+(https?'s':'')+'://'+this.state.server+api_base_uri(this.state.orgId)+'/turf/get?turfId='+selectedTurf.id,
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

      this.setState({turfStats: json});
    } catch (e) {
      this.triggerNetworkWarning();
    }

    this.setState({fetchingTurfStats: false});
  }

  _dataFetch = async (pos, flag) => {
    const { canvassSettings, myPosition, lastFetchPosition, fetching } = this.state;
    let ret = {error: false};

    if (!pos) pos = myPosition;

    if (!pos.longitude || !pos.latitude) return;

    if (fetching) return;

    this.setState({fetching: true});

    try {
      let https = true;
      if (this.state.server.match(/:8080/)) https = false;
      let res = await fetch('http'+(https?'s':'')+'://'+this.state.server+api_base_uri(this.state.orgId)+'/people/get/byposition', {
        method: 'POST',
        body: JSON.stringify({
          formId: this.state.form.id,
          longitude: pos.longitude,
          latitude: pos.latitude,
          limit: (canvassSettings.limit?canvassSettings.limit:100),
          filter_visited: (canvassSettings.filter_visited?'home':undefined),
          filters: (canvassSettings.filter_pins&&canvassSettings.filters?canvassSettings.filters:undefined),
        }),
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
      let people = [];
      let cities = [];
      let streets = [];

      // gather unique cities & streets
      json.forEach((marker) => {
        // catch null markers
        if (!marker.address) {
          console.warn("Null address on marker: ", marker);
          marker.address = {longitude: 0, latitude: 0, id: parseInt(Math.random()*1000)};
          return;
        }

        if (marker.people) marker.people.forEach(p => people.push({person: p, address_id: marker.address.id}));
        if (marker.units) {
          marker.units.forEach(u => {
            if (u.people) u.people.forEach(p => people.push({person: p, address_id: marker.address.id, unit: u}));
          });
        }

        // stop at 10 streets for performance reasons; lots of Accordion is slow
        if (listview_order.length >= 10) return;

        let street = marker.address.street.replace(/\d+ /, '');

        if (!listview[street]) {
          listview[street] = [];
          listview_order.push(street);
        }

        listview[street].push(marker);
      });

      Object.keys(listview).forEach((street) => listview[street].sort(bystreet));

      this.setState({lastFetchPosition: pos, markers: json, listview, listview_order, people, last_fetch: getEpoch()});
    } catch (e) {
      console.warn("Error: "+e);
      ret.error = true;
      this.triggerNetworkWarning();
    }

    this.setState({fetching: false});

    return ret;
  }

  sendVisit(id, place, unit, person, start, json) {
    const { form, myPosition, UniqueID } = this.state;
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
      deviceId: UniqueID,
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
    const { form, myPosition, UniqueID } = this.state;

    let now = getEpoch();

    let input = {
      deviceId: UniqueID,
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
      let https = true;
      if (this.state.server.match(/:8080/)) https = false;
      let res = await fetch('http'+(https?'s':'')+'://'+this.state.server+api_base_uri(this.state.orgId)+uri, {
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

      this.setState({checkHistory: true});

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

  addUnit = async () => {
    let { form, myPosition, UniqueID } = this.state;

    let json = this.refs.unitForm.getValue();
    if (json == null) return;

    // search for dupes
    let dupe = false;
    this.state.currentMarker.units.forEach(u => {
      if (u.name.toLowerCase() === json.unit.toLowerCase()) dupe = true;
    });

    if (!dupe) {
      let input = {
        deviceId: UniqueID,
        formId: form.id,
        timestamp: getEpoch(),
        longitude: myPosition.longitude,
        latitude: myPosition.latitude,
        unit: json.unit,
        addressId: this.state.currentMarker.address.id,
      };

      this.sendData('/address/add/unit', input);
      this.state.currentMarker.units.push({name: json.unit, people: []});
    }

    this.setState({newUnitDialog: false, fUnit: {}});
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

  updateTurfInfo(pos) {
    if (this.state.turfs) {
      let selectedTurf = {};
      for (let i in this.state.turfs) {
        if (ingeojson(this.state.turfs[i], pos.longitude, pos.latitude)) {
          selectedTurf = this.state.turfs[i];
          break;
        }
      }
      this.setState({selectedTurf});
    }
  }

  peopleSearch(text) {
    this.setState({peopleSearch: text})
  }

  render() {
    const { navigate } = this.props.navigation;
    const {
      showDisclosure, myPosition, myNodes, locationAccess, serviceError, deviceError,
      form, loading, region, active, segmentList, segmentTurf, fetching, selectedTurf, mapCenter,
      newAddressDialog, newUnitDialog, onlyPhonePeople, confirmDialog, confirmDialogTitle,
      confirmDialogMessage, confirmDialogPositiveButton, confirmDialogNegativeButton,
    } = this.state;

    if (showDisclosure) {
      return (<TermsDisclosure refer={this} />);
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
    } else if (deviceError === true) {
      nomap_content.push(
        <View key={1} style={styles.content}>
          <Text>Device Error.</Text>
        </View>
      );
    } else if (myPosition.latitude === null || myPosition.longitude === null) {
      nomap_content.push(
        <View key={1} style={styles.content}>
          <Text>Waiting on location data from your device...</Text>
          <Spinner />
        </View>
      );
    }

    let geofence = [];
    if (this.state.turfs) {
      for (let i in this.state.turfs) {
        geojson2polygons(this.state.turfs[i], true).forEach(polygon => geofence.push({id: this.state.turfs[i].id, name: this.state.turfs[i].name, polygon: polygon}));
      }
    }

    // NOTE: always render the MapView, even if not on the Map View Tab. This keeps the
    // the component loaded in memory for better performance when switching back and forth
    return (
      <Container>
        <Content>
        {active==='list'&&
          <ListTab refer={this} />
        }
        {active==='turf'&&
          <TurfTab refer={this} />
        }
        {active==='settings'&&
          <SettingsTab refer={this} form={form} />
        }
        </Content>

        {nomap_content.length &&
          <View>
            { nomap_content }
          </View>
        ||
        <MapView
          ref={component => this.map = component}
          initialRegion={{latitude: myPosition.latitude, longitude: myPosition.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta}}
          onMapReady={() => {
            this.setState({mapCenter: myPosition});
            this.map.animateToRegion({
              latitude: myPosition.latitude,
              longitude: myPosition.longitude,
              latitudeDelta: region.latitudeDelta,
              longitudeDelta: region.longitudeDelta,
            });
          }}
          provider={PROVIDER_GOOGLE}
          style={(active==='map'?styles.map:null)}
          showsUserLocation={true}
          followsUserLocation={false}
          keyboardShouldPersistTaps={true}
          onRegionChangeComplete={this.onRegionChange}
          showsIndoors={false}
          showsTraffic={false}
          onPress={(e) => e.nativeEvent.coordinate && this.updateTurfInfo(e.nativeEvent.coordinate)}
          onLongPress={(e) => this.add_new && e.nativeEvent.coordinate && this.showConfirmAddress(e.nativeEvent.coordinate)}
          {...this.props}>
          {active==='map'&&geofence.map((g, idx) => <MapView.Polyline key={idx} coordinates={g.polygon} strokeWidth={2} strokeColor={(g.id === selectedTurf.id ? "blue" : "black")} />)}
          {active==='map'&&this.state.markers.map((marker) => (
              <MapView.Marker
                key={marker.address.id}
                coordinate={{longitude: marker.address.longitude, latitude: marker.address.latitude}}
                onPress={(e) => e.nativeEvent.coordinate && this.updateTurfInfo(e.nativeEvent.coordinate)}
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
          {active==='map'&&this.state.searchPins.map((place, idx) => (
              <MapView.Marker
                key={idx}
                coordinate={place.location}
                onPress={(e) => e.nativeEvent.coordinate && this.updateTurfInfo(e.nativeEvent.coordinate)}
                pinColor={"purple"}>
                <MapView.Callout onPress={() => this.add_new && this.showConfirmAddress(place.location)}>
                  <View style={{backgroundColor: '#FFFFFF', padding: 5, width: 175}}>
                    <Text style={{fontWeight: 'bold'}}>
                      {place.address}
                    </Text>
                    {this.add_new&&<Text>Tap to add this address.</Text>}
                  </View>
                </MapView.Callout>
              </MapView.Marker>
          ))}
        </MapView>
        }

        {fetching&&
        <View style={{position: 'absolute', right: 0, ...styles.iconContainer}}>
          <Spinner />
        </View>
        }

        {active==='map'&&selectedTurf.id&&
        <TouchableOpacity style={{position: 'absolute', left: 0, ...styles.turfInfoContainer}}
          onPress={() => {
            this._loadTurfStats();
            this.setState({active: 'turf', segmentTurf: 'stats'});
          }}>
          <Text>{selectedTurf.name}</Text>
        </TouchableOpacity>
        }

        {active==='map' && nomap_content.length === 0 &&
        <View style={{alignItems: 'center', justifyContent: 'flex-end'}}>
          <View style={{flexDirection: 'row', marginVertical: 5, backgroundColor: 'transparent',}}>

            {this.state.canvassSettings.chill_mode &&
            <TouchableOpacity style={styles.iconContainer} disabled={fetching}
              onPress={() => this._dataGet(mapCenter)}>
              <Icon
                name="refresh"
                size={50}
                color={(fetching?"#d3d3d3":"#00a86b")}
                {...styles.icon} />
            </TouchableOpacity>
            }

            <TouchableOpacity style={styles.iconContainer}
              onPress={() => {
                if (this.state.canvassSettings.chill_mode) this._dataGet(myPosition);
                this.map.animateToCoordinate(myPosition, 1000);
              }}>
              <Icon
                name="location-arrow"
                size={50}
                color="#0084b4"
                {...styles.icon} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconContainer}
              onPress={() => {
                RNGooglePlaces.openAutocompleteModal(
                  {
                    locationBias: {
                      latitudeNE: mapCenter.latitude+0.1,
                      longitudeNE: mapCenter.longitude+0.1,
                      latitudeSW: mapCenter.latitude-0.1,
                      longitudeSW: mapCenter.longitude-0.1,
                    }
                  },
                  ['location','address']
                ).then((place) => {
                  this.dropSearchPin(place);
                  this.map.animateToCoordinate(place.location, 1000);
                })
                .catch(e => {});
              }}>
              <Icon
                name="search"
                size={40}
                color="#000000"
                {...styles.icon} />
            </TouchableOpacity>

          </View>
        </View>
        }

        <Dialog
          visible={newAddressDialog}
          animationType="fade"
          onTouchOutside={() => this.setState({newAddressDialog: false})}>
          <View>
            {loading &&
            <View>
              <H3>Loading Address</H3>
              <Spinner />
            </View>
            ||
            <View>
              <Button block dark transparent>
                <H3>Confirm the Address</H3>
              </Button>
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
              <Button block onPress={this.doConfirmAddress}>
                <Text>Add Address</Text>
              </Button>
            </View>
            }
          </View>
        </Dialog>

        <Dialog
          visible={newUnitDialog}
          animationType="fade"
          onTouchOutside={() => this.setState({newUnitDialog: false})}>
          <View>
            <View style={{flex: 1, flexDirection: 'row', margin: 20, alignItems: 'center'}}>
              <Text>Recording a new unit for this address:</Text>
            </View>
            <Form
              ref="unitForm"
              type={unitForm}
              options={{fields: {unit: {autoFocus: true}}}}
              onChange={this.onUnitChange}
              value={this.state.fUnit}
            />
            <Button block onPress={this.addUnit}>
              <Text>Add Unit</Text>
            </Button>
          </View>
        </Dialog>

        <ConfirmDialog
          title={confirmDialogTitle}
          message={confirmDialogMessage}
          visible={confirmDialog}
          onTouchOutside={() => this.setState({confirmDialog: false})}
          positiveButton={confirmDialogPositiveButton}
          negativeButton={confirmDialogNegativeButton}
        />

        <Footer>
          <FooterTab>
            <Button active={(active === 'map'?true:false)} onPress={() => this.setState({active: 'map'})}>
              <Icon name="map" size={25} />
              <Text>Map View</Text>
            </Button>
            <Button active={(active === 'list'?true:false)} onPress={() => this.setState({active: 'list'})}>
              <Icon name="list" size={25} />
              <Text>List View</Text>
            </Button>
            <Button active={(active === 'turf'?true:false)} onPress={() => this.setState({active: 'turf'})}>
              <Icon name="compass" size={25} />
              <Text>Turf</Text>
            </Button>
            <Button active={(active === 'settings'?true:false)} onPress={() => this.setState({active: 'settings'})}>
              <Icon name="cog" size={25} />
              <Text>Settings</Text>
            </Button>
          </FooterTab>
        </Footer>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    ...StyleSheet.absoluteFillObject,
  },
});
