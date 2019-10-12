import React, { PureComponent } from 'react';

import {
  StyleSheet,
  FlatList,
  Image,
  View,
  TouchableOpacity,
} from 'react-native';

import {
  Accordion, Container, Content, Header, Footer, FooterTab, Tab, Tabs, Text,
  Button, Segment, Spinner, ListItem, Body, CheckBox, Item, Input, CardItem,
  H3,
} from 'native-base';

import {
  Divider, DINFO, api_base_uri, _doGeocode, _getApiToken, getEpoch, PersonAttr, openURL
} from '../common';

import LocationComponent from '../LocationComponent';

import { NavigationActions } from 'react-navigation';
import storage from 'react-native-storage-wrapper';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import RNGooglePlaces from 'react-native-google-places';
import Knock from './Knock';
import Settings from './Settings';
import { ConfirmDialog, Dialog } from 'react-native-simple-dialogs';
import md5 from 'md5';
import { debounce } from 'throttle-debounce';
import { orderBy } from 'natural-orderby';
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
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
      active: 'map',
      segmentList: 'streets',
      segmentTurf: 'list',
      selectedTurf: {},
      listview: {},
      listview_order: [],
      activeCity: [0],
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
      DisclosureKey : 'OV_DISCLOUSER',
      settingsStorageKey: 'OV_CANVASS_SETTINGS',
      canvassSettings: {},
      newAddressDialog: false,
      newUnitDialog: false,
      tosError: false,
      showDisclosure: "true",
      form: props.navigation.state.params.form,
      orgId: props.navigation.state.params.orgId,
      user: props.navigation.state.params.user,
      turfs: props.navigation.state.params.form.turfs,
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
    this._getCanvassSettings();
    this.requestLocationPermission();
    this.setupConnectionListener();
    this.LoadDisclosure(); //Updates showDisclosure state if the user previously accepted
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
      const value = await storage.get(this.state.settingsStorageKey);
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
      await storage.set(this.state.settingsStorageKey, str);
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

  getEpoch() {
    return Math.floor(new Date().getTime())
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

    let epoch = this.getEpoch();

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

  LoadDisclosure = async () => {
    try {
      const value = await storage.get(this.state.DisclosureKey);
      if (value !== null) {
        this.setState({showDisclosure : value});
      }
    } catch (error) {}
  }

  SaveDisclosure = async () => {
    this.setState({ showDisclosure: "false"});
    try {
      await storage.set(this.state.DisclosureKey, "false");
    } catch (error) {}
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

    this.setState({active: 'turfstats', fetchingTurfStats: true});

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
        timestamp: this.getEpoch(),
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

  _canvassGuidelinesUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/HelloVoter/blob/master/docs/Canvassing-Guidelines.md";
    return openURL(url);
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
      form, user, loading, region, active, segmentList, segmentTurf, fetching, selectedTurf, mapCenter,
      newAddressDialog, newUnitDialog, onlyPhonePeople, confirmDialog, confirmDialogTitle,
      confirmDialogMessage, confirmDialogPositiveButton, confirmDialogNegativeButton, ack, tosError,
    } = this.state;

    if (showDisclosure === "true") {
      return (
        <Container>
          <Content padder>
            <Button block transparent onPress={() => {this._canvassGuidelinesUrlHandler()}}>
              <H3>Terms of Service</H3>
            </Button>

            <Text></Text>

            <Text>
              Our Voice USA provides this canvassing tool for free for you to use for your own purposes.
            </Text>

            <Text></Text>

            <Text>
              By using this tool you acknowledge that you are acting on your own behalf, do not represent Our Voice USA
              or its affiliates, and have read our <Text style={{fontSize: 18, fontWeight: 'bold', color: 'blue'}} onPress={() => {this._canvassGuidelinesUrlHandler()}}>
              Terms of Service</Text>.
            </Text>

            <Text></Text>

            <Text>Please be courteous to those you meet.</Text>

            <Text></Text>

            <ListItem onPress={() => this.setState({ack: !ack})} error>
              <CheckBox checked={ack} onPress={() => this.setState({ack: !ack})} />
              <Body>
                <Text>I have read & agree to the Terms of Service</Text>
              </Body>
            </ListItem>

            <Text></Text>

            <Button block onPress={() => {
              if (ack) this.SaveDisclosure();
              else this.setState({tosError: true});
            }}>
              <Text>Continue</Text>
            </Button>

            <Text></Text>

            <Button block danger onPress={() => this.props.navigation.dispatch(NavigationActions.back())}>
              <Text>Exit</Text>
            </Button>

            <ConfirmDialog
              title="Terms of Service"
              message="You must agree to the terms of service to continue."
              visible={tosError}
              animationType="fade"
              onTouchOutside={() => this.setState({tosError: false})}
              positiveButton={{title: "OK", onPress: () => this.setState({tosError: false})}}
            />

          </Content>
        </Container>
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

    return (
      <Container>
        <Content>
        {active==='turfstats'&&
          <TurfStats refer={this} loading={this.state.fetchingTurfStats} data={this.state.turfStats} />
        }
        {active==='list'&&
          <View>
            <Segment>
              <Button first active={(segmentList==='streets')} onPress={() => this.setState({segmentList: 'streets'})}><Text>Streets</Text></Button>
              <Button active={(segmentList==='residence')} onPress={() => this.setState({segmentList: 'residence'})}><Text>Residence</Text></Button>
              <Button active={(segmentList==='people')} onPress={() => this.setState({segmentList: 'people'})}><Text>People</Text></Button>
              <Button last active={(segmentList==='history')} onPress={() => this.setState({segmentList: 'history'})}><Text>History</Text></Button>
            </Segment>
            {segmentList==='people'&&
            <View>
              <Header searchBar rounded>
                <Item>
                  <Icon name="search" />
                  <Input placeholder="Search" onChangeText={text => this.peopleSearchDebounce(text)} />
                  <Icon name="group" />
                </Item>
              </Header>
              <ListItem onPress={() => this.setState({onlyPhonePeople: !onlyPhonePeople})}>
                <CheckBox checked={onlyPhonePeople} onPress={() => this.setState({onlyPhonePeople: !onlyPhonePeople})} />
                <Body>
                  <Text>Only show those with a Phone Number</Text>
                </Body>
              </ListItem>
            </View>
            }
            <SegmentStreets refer={this} />
            <SegmentResidence refer={this} />
            <SegmentPeople refer={this} />
            <SegmentHistory refer={this} />
          </View>
        }
        {active==='turf'&&
          <View>
            <Segment>
              <Button first active={(segmentTurf==='list')} onPress={() => this.setState({segmentTurf: 'list'})}><Text>List</Text></Button>
              <Button last active={(segmentTurf==='stats')} onPress={() => this.setState({segmentTurf: 'stats'})}><Text>Stats</Text></Button>
            </Segment>
            <Content>
              <Text>{JSON.stringify(this.state.turfs.map(t => t.name))}</Text>
            </Content>
          </View>
        }
        {active==='settings'&&
          <Settings refer={this} form={form} />
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
          {geofence.map((g, idx) => <MapView.Polyline key={idx} coordinates={g.polygon} strokeWidth={2} strokeColor={(g.id === selectedTurf.id ? "blue" : "black")} />)}
          {this.state.markers.map((marker) => (
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
          {this.state.searchPins.map((place, idx) => (
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
                {...iconStyles} />
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
                {...iconStyles} />
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
                {...iconStyles} />
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

function statusToText(code) {
  switch (code) {
    case 0: return 'Not Home';
    case 1: return 'Home';
    case 2: return 'Not Interested';
    case 3: return 'Moved';
    default: return 'unknown';
  }
}

function timeFormat(epoch) {
  let date = new Date(epoch);
  return date.toLocaleDateString('en-us')+" "+date.toLocaleTimeString('en-us');
}

const Unit = props => (
  <View key={props.unit.name} style={{padding: 10}}>
    <View
      style={{flexDirection: 'row', alignItems: 'center'}}>
      <Icon name={(props.color === "red" ? "ban" : "address-book")} size={40} color={props.color} style={{margin: 5}} />
      <Text>Unit {(props.unknown?"Unknown":props.unit.name)} - {props.refer.getLastVisit(props.unit)}</Text>
    </View>
  </View>
);

const TurfStats = props => (
  <View>
    {props.loading&&
    <Spinner />
    }
    {!props.loading&&
    <View style={{padding: 10}}>
      <Text>{JSON.stringify(props.data.stats)}</Text>
    </View>
    }
  </View>
);

const SegmentStreets = props => {
  let rstate = props.refer.state;
  if (rstate.segmentList!=='streets') return null;

  if (!rstate.listview_order.length) return (<Text style={{margin: 10}}>No address data for this area. Try widening your view on the map or adjusting your filter settings.</Text>);

  return (
    <Accordion
      dataArray={rstate.listview_order}
      onAccordionOpen={(s, idx) => props.refer.setState({selectedStreet: idx})}
      onAccordionClose={(s, idx) => props.refer.setState({selectedStreet: null})}
      expanded={rstate.selectedStreet}
      renderHeader={(street, ex) => (
        <View>
          <View style={{flex: 1, flexDirection: 'row'}}>
            <Icon
              style={{margin: 20, marginRight: 10}}
              size={20}
              name={(ex?"minus-circle":"plus-circle")}
              backgroundColor="#d7d7d7"
              color="black"
            />
            <Text style={{alignSelf: 'center', margin: 20, marginLeft: 10}}>{street} ({rstate.listview[street].length})</Text>
          </View>
          <Divider />
        </View>
      )}
      renderContent={(street) => {
        return rstate.listview[street].map((marker, idx) => {
          let color = props.refer.getPinColor(marker);
          let icon = (color === "red" ? "ban" : "home");
          let num_people = marker.people.length;
          marker.units.forEach((u) => num_people+=u.people.length);

          return (
            <View key={idx} style={{padding: 10, paddingTop: 0}}>
              <TouchableOpacity
                style={{flexDirection: 'row', alignItems: 'center'}}
                onPress={() => props.refer.doMarkerPress(marker)}>
                <Icon name={icon} size={40} color={color} style={{margin: 5}} />
                <Text>{marker.address.street} - {props.refer.getLastVisit(marker)} ({num_people})</Text>
                </TouchableOpacity>
                <Divider />
              </View>
            );
          }
        )

      }}
    />
  );
};

const SegmentResidence = props => {
  let rstate = props.refer.state;
  if (rstate.segmentList!=='residence') return null;

  if (!rstate.currentMarker) return (<Text>No residence is selected.</Text>);

  if (rstate.currentMarker.units && rstate.currentMarker.units.length) {
    return (
      <View>
        <Text style={{fontSize: 20, padding: 10}}>{rstate.currentMarker.address.street}, {rstate.currentMarker.address.city}</Text>

        {props.refer.add_new &&
        <Icon.Button
          name="plus-circle"
          backgroundColor="#d7d7d7"
          color="#000000"
          onPress={() => {
            if (!props.refer.addOk()) return this.alert("Active Filter", "You cannot add a new address while a filter is active.");
            props.refer.setState({ newUnitDialog: true });
          }}
          {...iconStyles}>
          Add new unit/apt number
        </Icon.Button>
        }

        {(rstate.currentMarker.people && rstate.currentMarker.people.length !== 0) &&
        <Unit unit={rstate.currentMarker}
          unknown={true}
          refer={props.refer}
          color={props.refer.getPinColor(rstate.currentMarker)} />
        }

        <Accordion dataArray={rstate.currentMarker.units}
          renderHeader={(u) => (
            <Unit unit={u}
              refer={props.refer}
              color={props.refer.getPinColor(u)} />
          )}
          renderContent={(u) => (
            <Knock refer={props.refer} funcs={props.refer} marker={rstate.currentMarker} unit={u} form={rstate.form} />
          )}
        />
    </View>
    );
  }

  return (
    <Knock refer={props.refer} funcs={props.refer} marker={rstate.currentMarker} form={rstate.form} />
  );
}

function pname(person) {
  let name = "";
  if (person.attrs) {
    person.attrs.forEach(a => {
      if (a.id === "013a31db-fe24-4fad-ab6a-dd9d831e72f9") name = a.value;
    });
  }
  return name.toLowerCase();
}

function pnumber(person) {
  let havePhone = false;
  if (person.attrs) {
    person.attrs.forEach(a => {
      if (a.id === "7d3466e5-2cee-491e-b3f4-bfea3a4b010a" && a.value) havePhone = true;
    });
  }
  return havePhone;
}

const SegmentPeople = props => {
  const { navigate } = props.refer.props.navigation;
  let rstate = props.refer.state;

  if (rstate.segmentList!=='people') return null;

  if (!rstate.people.length) return (<Text style={{margin: 10}}>No people data for this area. Try widening your view on the map or adjusting your filter settings.</Text>);

  let form = rstate.form;
  let people;

  if (rstate.peopleSearch) people = rstate.people.filter(p => pname(p.person).match(rstate.peopleSearch.toLowerCase()));
  else people = rstate.people;

  if (rstate.onlyPhonePeople) people = people.filter(p => pnumber(p.person));

  let arr = [(
    <View>
      <Text>Showing {(people.length>=10?10:people.length)} of {people.length} in this area.</Text>
    </View>
  )];

  people.filter((p, i) => (i < 10)).map(p => arr.push((
    <View key={p.id} style={{padding: 5}}>
      <View style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}>
                  <TouchableOpacity
                    style={{flexDirection: 'row', alignItems: 'center'}}
                    onPress={() => {
                      // find marker & unit by person
                      let marker = rstate.markers.find(m => m.address.id === p.address_id)
                      navigate('Survey', {refer: props.refer, funcs: props.refer, form: form, marker: marker, unit: p.unit, person: p.person});
                    }}>
                    <Icon name="user" color="black" size={40} style={{margin: 5}} />
                    <View>
                      <PersonAttr form={form} idx={0} attrs={p.person.attrs} />
                      <PersonAttr form={form} idx={1} attrs={p.person.attrs} />
                      <PersonAttr form={form} idx={2} attrs={p.person.attrs} />
                    </View>
                  </TouchableOpacity>
      </View>
      <Text>{' '}</Text>
    </View>
  )));

  return arr;
};

const SegmentHistory = props => {
  let rstate = props.refer.state;
  if (rstate.segmentList!=='history') return null;

  return (
    <Content>
      {rstate.fetchingHistory&&
      <Spinner />
      }
      {!rstate.fetchingHistory&&
      <View style={{padding: 10}}>
        <Text>{(rstate.history.length?'Loaded '+rstate.history.length+' historical actions:':'No history to view')}</Text>
      </View>
      }
      <FlatList
        scrollEnabled={false}
        data={rstate.history}
        keyExtractor={item => ""+item.id}
        renderItem={({item}) => (
          <View key={item.id}>
            <Divider />
            <TouchableOpacity style={{marginTop: 10, marginBottom: 10}}
              onPress={() => {
                props.refer.setState({active: 'map'});
                let pos = {
                  longitude: item.address.position.x,
                  latitude: item.address.position.y,
                }
                if (rstate.canvassSettings.chill_mode)
                  props.refer._dataGet(pos);
                props.refer.map.animateToCoordinate(pos, 1000);
              }}>
              <View style={{flexDirection: 'row'}}>
                <View style={{width: 100, alignItems: 'center'}}>
                  <Image source={{ uri: item.volunteer.avatar }} style={{height: 50, width: 50, padding: 10, borderRadius: 20}} />
                  <Text>{item.volunteer.name}</Text>
                </View>
                <View>
                  <Text>Date: {timeFormat(item.datetime)}</Text>
                  <Text>Address: {item.address.street}</Text>
                  <Text>Status: {statusToText(item.status)}</Text>
                  <Text>Contact: {(item.person?item.person.name:'N/A')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    </Content>
  );
};

const iconStyles = {
  justifyContent: 'center',
  borderRadius: 10,
  padding: 10,
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
  turfInfoContainer: {
    backgroundColor: '#ffffff', width: 125, height: 45,
    borderWidth: 2, borderColor: '#000000',
    alignItems: 'center', justifyContent: 'center', margin: 2.5,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
