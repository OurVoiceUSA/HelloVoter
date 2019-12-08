import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Toast, Container, Content, Footer, FooterTab, Text, Button, Spinner } from 'native-base';

import TermsDisclosure, { loadDisclosure } from '../TermsDisclosure';
import LocationComponent from '../LocationComponent';
import { HVConfirmDialog } from '../HVComponent';
import { SelectFormDialog, NewAddressDialog } from './FormDialogs';
import ListTab from './ListTab';
import DispatchTab from './DispatchTab';
import SettingsTab from './SettingsTab';

import {
  DINFO, STORAGE_KEY_SETTINGS, STORAGE_KEY_RETRY,
  api_base_uri, _doGeocode, _getApiToken, openURL, getEpoch, getLastVisit, getPinColor,
} from '../common';

import { deepCopy, geojson2polygons, ingeojson } from 'ourvoiceusa-sdk-js';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import Icon from 'react-native-vector-icons/FontAwesome';
import RNGooglePlaces from 'react-native-google-places';
import NetInfo from '@react-native-community/netinfo';
import storage from 'react-native-storage-wrapper';
import KeepAwake from 'react-native-keep-awake';
import { debounce } from 'throttle-debounce';
import QRCode from 'qrcode';

function bystreet(a,b) {
  let na = parseInt(a.address.street.replace(/(\d+) .*/, '$1'));
  let nb = parseInt(b.address.street.replace(/(\d+) .*/, '$1'));

  if ( na < nb ) return -1;
  if ( na > nb ) return 1;
  return 0;
}

function triggerNetworkWarning() {
  Toast.show({
    text: 'Network Error',
    buttonText: 'OK',
    position: 'bottom',
    type: 'warning',
    duration: 5000,
  });
}

export default class App extends LocationComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
      server: props.navigation.state.params.server,
      orgId: props.navigation.state.params.orgId,
      admin: props.navigation.state.params.admin,
      forms: props.navigation.state.params.forms,
      form: {},
      turfs: [],
      active: 'map',
      activePrev: 'map',
      segmentList: 'streets',
      segmentDispatch: 'info',
      selectedTurf: {},
      listview: {},
      listview_order: [],
      last_fetch: 0,
      mapCamera: {},
      loading: false,
      fetching: false,
      fetchingHistory: false,
      fetchingturfInfo: false,
      checkHistory: true,
      pressAddsSearchPin: false,
      history: [],
      turfInfo: {},
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
      selectFormDialog: (props.navigation.state.params.forms.length===1?false:true),
      newAddressDialog: false,
      newUnitDialog: false,
      showDisclosure: null,
      retry_queue: [],
    };

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
          onPress: () => this.byeFelicia(),
        },
        {
          title: "No",
          onPress: () => this.setState({confirmDialog: false}),
        }
      );
    };
  }

  componentDidMount() {
    const { forms } = this.state;

    DINFO().then(i => this.setState({UniqueID: i.UniqueID})).catch(() => this.setState({deviceError: true}));
    loadDisclosure(this);
    this._getCanvassSettings();
    this.requestLocationPermission();
    this.setupConnectionListener();
    this.loadRetryQueue();
    // auto-select form if there's only one
    if (forms.length === 1) this.selectForm(forms[0]);
  }

  selectForm(form) {
    this.setState({form, turfs: form.turfs, selectFormDialog: false});
    if (form.add_new) this.add_new = true;
    else this.add_new = false;
    this._dataGet()
  }

  byeFelicia() {
    this.setState({confirmDialog: false});
    this.state.refer._loadForms();
    this.goBack();
  }

  onRegionChange = async () => {
    let cam = await this.map.getCamera();

    this.setState({mapCamera: cam})
    if (this.state.canvassSettings.pin_auto_reload === true) this._dataGet(cam.center);
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
    this.setState({searchPins, pressAddsSearchPin: false});
    Toast.hide();
    this.selectSelectedSearchPin = true;
    this.animateToCoordinate(place.location);
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
      triggerNetworkWarning(e);
    }

    this.setState({fetchingHistory: false});
  }

  addOk = () => {
    if (this.state.canvassSettings.filter_pins) return false;
    if (this.state.canvassSettings.filter_visited) return false;
    return true;
  }

  showConfirmAddress = (pos) => {
    const { mapCamera, myPosition } = this.state;

    if (!this.addOk()) return this.alert("Active Filter", "You cannot add a new address while a filter is active.");

    this.setState({searchPins: []});

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

  doMarkerPress = (marker) => {
    const { navigate } = this.props.navigation;
    const { active, form } = this.state;

    this.setState({currentMarker: marker});

    this.setState({active: 'list', activePrev: active, segmentList: 'residence'});
  }

  updateLocalMarker(place, input) {
    // add interaction locally so app updates color
    if (!place.visits) place.visits = [];
    place.visits.push(input);
    this.forceUpdate();
  }

  _loadturfInfo = async () => {
    const { active, form, server, orgId, selectedTurf } = this.state;

    this.setState({active: 'dispatch', activePrev: active, segmentDispatch: 'turf', fetchingturfInfo: true});

    try {
      let https = true;
      if (server.match(/:8080/)) https = false;
      let res = await fetch(
        'http'+(https?'s':'')+'://'+server+api_base_uri(orgId)+'/turf/get?turfId='+selectedTurf.id+'&formId='+form.id,
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

      if (json.qrcode) json.qrcode_img = await QRCode.toString('http'+(https?'s':'')+'://'+server+api_base_uri(orgId)+'mobile/invite?inviteCode='+json.qrcode+'&'+(orgId?'orgId='+orgId:'server='+server));

      this.setState({turfInfo: json});
    } catch (e) {
      triggerNetworkWarning(e);
    }

    this.setState({fetchingturfInfo: false});
  }

  _dataFetch = async (pos, flag) => {
    const {
      canvassSettings, myPosition, lastFetchPosition, fetching, retry_queue,
      showDisclosure, form,
    } = this.state;
    if (!form.id) return;
    if (!pos) pos = myPosition;

    if (!pos.longitude || !pos.latitude) return;

    if (fetching) return;

    this.setState({fetching: true});

    if (retry_queue.length) await this.doRetry();

    try {
      let https = true;
      if (this.state.server.match(/:8080/)) https = false;
      let res = await fetch('http'+(https?'s':'')+'://'+this.state.server+api_base_uri(this.state.orgId)+'/people/get/byposition', {
        method: 'POST',
        body: JSON.stringify({
          formId: form.id,
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
        if (res.status >= 400 && res.status < 500) return this.byeFelicia();
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

      if (listview_order.length === 0 && showDisclosure === false)
        Toast.show({
          text: 'No data for this area.',
          buttonText: 'OK',
          position: 'bottom',
          type: 'warning',
          duration: 4000,
        });
      else
        Toast.hide();

      this.setState({lastFetchPosition: pos, markers: json, listview, listview_order, people, last_fetch: getEpoch()});
    } catch (e) {
      triggerNetworkWarning(e);
    }

    this.setState({fetching: false});
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

      if (res.status >= 400 && res.status < 500) return this.byeFelicia();

      if (res.status !== 200) {
        throw "sendData error";
      }

      this.setState({checkHistory: true});

    } catch (e) {
      console.log({error: e})
      await this.queueRetry(uri, input);
    }
  }

  queueRetry = async (uri, input) => {
    let { retry_queue } = this.state;
    retry_queue.push({uri: uri, input: input});
    this.setState({retry_queue});
    try {
      await storage.set(STORAGE_KEY_RETRY, JSON.stringify(retry_queue));
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
      await storage.del(STORAGE_KEY_RETRY);
    } catch (e) {
      triggerNetworkWarning(e);
    }

    this.setState({retry_running: false});
  }

  loadRetryQueue = async () => {
    try {
      const value = await storage.get(STORAGE_KEY_RETRY);
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

  animateToCoordinate = async (pos, pan) => {
    const { active, lastCam } = this.state;
    let toggle = false;

    let cam = await this.map.getCamera();
    let pitch = cam.pitch;

    if (pan && lastCam && cam.center.longitude === lastCam.center.longitude) {
      if (pitch === 65) pitch = 0;
      else pitch = 65;
      toggle = true;
    }

    if (!this.state.canvassSettings.pin_auto_reload && !toggle) this._dataGet(pos);
    this.setState({active: 'map', activePrev: active});
    this.map.animateCamera({
        pitch,
        center: pos,
        heading: 0,
        zoom: 20,
      },
      500
    );

    setTimeout(async () => this.setState({lastCam: (pan?await this.map.getCamera():null)}), 550);
  }

  render() {
    const { navigate } = this.props.navigation;
    const {
      showDisclosure, myPosition, locationAccess, serviceError, deviceError,
      form, loading, region, active, segmentList, segmentDispatch, fetching, selectedTurf, mapCamera,
      newAddressDialog, newUnitDialog, onlyPhonePeople, searchPins, pressAddsSearchPin,
    } = this.state;

    // initial render
    if (showDisclosure === null) {
      return (
        <Container>
          <Content>
            <Spinner />
          </Content>
        </Container>
      );
    } else if (showDisclosure) {
      return (<TermsDisclosure refer={this} />);
    }

    var nomap_content = [];

    if (locationAccess === false) {
      nomap_content.push(
        <View key={1}>
          <Text>Unable to determine your location.</Text>
          <Text>To view the map, enable location permissions in your device settings.</Text>
        </View>
      );
    } else if (serviceError === true) {
      nomap_content.push(
        <View key={1}>
          <Text>Unable to load location services from your device.</Text>
        </View>
      );
    } else if (deviceError === true) {
      nomap_content.push(
        <View key={1}>
          <Text>Device Error.</Text>
        </View>
      );
    } else if (myPosition.latitude === null || myPosition.longitude === null) {
      nomap_content.push(
        <View key={1}>
          <Text>Waiting on location data from your device.</Text>
          <Spinner />
        </View>
      );
    }

    if (nomap_content.length) return (
      <Container>
        <Content>
          <View style={{alignSelf: 'center'}}>
            { nomap_content }
          </View>
        </Content>
        <HVConfirmDialog refer={this} />
      </Container>
    );

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
          <View>
          {active==='list'&&
            <ListTab refer={this} />
          }
          {active==='dispatch'&&
            <DispatchTab refer={this} />
          }
          {active==='settings'&&
            <SettingsTab refer={this} form={form} />
          }
          </View>
        </Content>

        <MapView
          ref={component => this.map = component}
          initialRegion={{latitude: myPosition.latitude, longitude: myPosition.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta}}
          onMapReady={() => this.animateToCoordinate(myPosition)}
          provider={PROVIDER_GOOGLE}
          style={(active==='map'?styles.map:null)}
          showsUserLocation={true}
          followsUserLocation={false}
          keyboardShouldPersistTaps={true}
          onRegionChangeComplete={this.onRegionChange}
          showsIndoors={false}
          showsTraffic={false}
          onPress={(e) => {
            if (e.nativeEvent.coordinate) this.updateTurfInfo(e.nativeEvent.coordinate);
            if (pressAddsSearchPin && e.nativeEvent.coordinate) this.dropSearchPin({location: e.nativeEvent.coordinate});
          }}
          {...this.props}>
          {active==='map'&&geofence.map((g, idx) => <MapView.Polyline key={idx} coordinates={g.polygon} strokeWidth={2} strokeColor={(g.id === selectedTurf.id ? "blue" : "black")} />)}
          {active==='map'&&this.state.markers.map((marker) => (
              <MapView.Marker
                key={marker.address.id}
                coordinate={{longitude: marker.address.longitude, latitude: marker.address.latitude}}
                onPress={(e) => e.nativeEvent.coordinate && this.updateTurfInfo(e.nativeEvent.coordinate)}
                pinColor={getPinColor(marker)}>
                <MapView.Callout onPress={() => this.doMarkerPress(marker)}>
                  <View style={{backgroundColor: '#FFFFFF', padding: 5, width: 175}}>
                    <Text style={{fontWeight: 'bold'}}>
                      {marker.address.street}, {marker.address.city}, {marker.address.state}, {marker.address.zip}
                    </Text>
                    <Text>{(marker.units.length ? 'Multi-unit address' : getLastVisit(marker))}</Text>
                  </View>
                </MapView.Callout>
              </MapView.Marker>
          ))}
          {active==='map'&&searchPins.map((place, idx) => (
              <MapView.Marker
                key={idx}
                ref={(idx===(searchPins.length-1)?(component) => {
                  this.selectedSearchPin = component;
                  if (this.selectSelectedSearchPin) {
                    this.selectSelectedSearchPin = false;
                    setTimeout(() => this.selectedSearchPin.showCallout(), 50);
                  }
                }:undefined)}
                coordinate={place.location}
                onPress={(e) => e.nativeEvent.coordinate && this.updateTurfInfo(e.nativeEvent.coordinate)}
                pinColor={"purple"}>
                <MapView.Callout onPress={() => this.add_new && this.showConfirmAddress(place.location)}>
                  <View style={{backgroundColor: '#FFFFFF', padding: 5, width: 175}}>
                    {place.address&&<Text style={{fontWeight: 'bold'}}>{place.address}</Text>}
                    {this.add_new&&<Button><Text>Add this location</Text></Button>}
                  </View>
                </MapView.Callout>
              </MapView.Marker>
          ))}
        </MapView>

        {fetching&&
        <View style={{position: 'absolute', right: 0, ...styles.iconContainer}}>
          <Spinner />
        </View>
        }

        {active==='map'&&selectedTurf.id&&
        <TouchableOpacity style={{position: 'absolute', left: 0, ...styles.turfInfoContainer}}
          onPress={() => this._loadturfInfo()}>
          <Text>{selectedTurf.name}</Text>
        </TouchableOpacity>
        }

        {active==='map' &&
        <View style={{alignItems: 'center', justifyContent: 'flex-end'}}>
          <View style={{flexDirection: 'row', marginVertical: 5, backgroundColor: 'transparent',}}>

            {!this.state.canvassSettings.pin_auto_reload &&
            <TouchableOpacity style={styles.iconContainer} disabled={fetching}
              onPress={() => this._dataGet(mapCamera.center)}>
              <Icon
                name="refresh"
                size={50}
                color={(fetching?"#d3d3d3":"#00a86b")}
                {...styles.icon} />
            </TouchableOpacity>
            }

            {this.add_new &&
            <TouchableOpacity style={styles.iconContainer}
              onPress={() => {
                if (pressAddsSearchPin) {
                  Toast.hide();
                  this.setState({pressAddsSearchPin: false});
                  return;
                }
                if (mapCamera.zoom < 20) this.animateToCoordinate(mapCamera.center);
                this.setState({pressAddsSearchPin: true, searchPins: []});
                Toast.show({
                  text: 'Tap on map where to add a marker.',
                  position: 'bottom',
                  type: 'success',
                  duration: 60000,
                });
              }}>
              <Icon
                name="map-marker"
                testID="map-marker"
                size={50}
                color={(pressAddsSearchPin?"purple":"#8b4513")}
                {...styles.icon} />
            </TouchableOpacity>
            }

            <TouchableOpacity style={styles.iconContainer}
              onPress={() => this.animateToCoordinate(myPosition, true)}>
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
                      latitudeNE: mapCamera.center.latitude+0.1,
                      longitudeNE: mapCamera.center.longitude+0.1,
                      latitudeSW: mapCamera.center.latitude-0.1,
                      longitudeSW: mapCamera.center.longitude-0.1,
                    }
                  },
                  ['location','address']
                ).then((place) => {
                  this.dropSearchPin(place);
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

        <SelectFormDialog refer={this} />
        <NewAddressDialog refer={this} />
        <HVConfirmDialog refer={this} />

        <Footer>
          <FooterTab>
            <Button active={(active === 'map'?true:false)} onPress={() => this.setState({active: 'map', activePrev: active})}>
              <Icon name="map" size={25} />
              <Text>Map View</Text>
            </Button>
            <Button active={(active === 'list'?true:false)} onPress={() => this.setState({active: 'list', activePrev: active})}>
              <Icon name="list" size={25} />
              <Text>List View</Text>
            </Button>
            <Button active={(active === 'turf'?true:false)} onPress={() => this.setState({active: 'dispatch', activePrev: active})}>
              <Icon name="user-plus" size={25} />
              <Text>Dispatch</Text>
            </Button>
            <Button active={(active === 'settings'?true:false)} onPress={() => this.setState({active: 'settings', activePrev: active})}>
              <Icon name="cog" size={25} />
              <Text>Settings</Text>
            </Button>
          </FooterTab>
        </Footer>
        <KeepAwake />
      </Container>
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
    ...StyleSheet.absoluteFillObject,
  },
});
