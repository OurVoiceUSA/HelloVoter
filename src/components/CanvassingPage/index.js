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
import sha1 from 'sha1';
import { MapView, Polygon, PROVIDER_GOOGLE } from 'react-native-maps'
import { API_BASE_URI, _doGeocode, _getApiToken } from '../../common';
import KnockPage from '../KnockPage';
import Modal from 'react-native-simple-modal';
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import t from 'tcomb-form-native';
import _ from 'lodash';
import {geojson2polygons, ingeojson} from 'ourvoiceusa-sdk-js';

TimeAgo.locale(en);

var Form = t.form.Form;

var formStreet = t.struct({
  'street': t.String,
});
var formCity = t.struct({
  'multi_unit': t.Boolean,
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

export default class App extends OVComponent {

  constructor(props) {
    super(props);

    this.state = {
      server: props.navigation.state.params.server,
      last_sync: 0,
      loading: false,
      netInfo: 'none',
      syncRunning: false,
      serviceError: null,
      locationAccess: null,
      myPosition: {latitude: null, longitude: null},
      region: {latitudeDelta: 0.004, longitudeDelta: 0.004},
      currentNode: null,
      markers: [],
      fAddress: {},
      pAddress: {},
      asyncStorageKey: 'OV_CANVASS_PINS@'+props.navigation.state.params.form.id,
      DisclosureKey : 'OV_DISCLOUSER',
      isModalVisible: false,
      isKnockMenuVisible: false,
      showDisclosure: "true",
      form: props.navigation.state.params.form,
      user: props.navigation.state.params.user,
      geofence: props.navigation.state.params.form.geofence,
      geofencename: props.navigation.state.params.form.geofencename,
    };

    this.myNodes = {};
    this.turfNodes = {};
    this.allNodes = {};

    this.family = {};
    this.fidx = [];

    this.onChange = this.onChange.bind(this);
    this.handleConnectivityChange = this.handleConnectivityChange.bind(this);
  }

  componentDidMount() {
    this.requestLocationPermission();
    this.setupConnectionListener();
    this._getNodesAsyncStorage();
    this.LoadDisclosure(); //Updates showDisclosure state if the user previously accepted
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

  showConfirmAddress() {
    const { myPosition } = this.state;

    if (this.state.netInfo === 'none') {
      this.setState({ isModalVisible: true });
      return;
    }

    if (myPosition.latitude !== null && myPosition.longitude !== null) {
      if (this.state.geofence && !ingeojson(this.state.geofence)) {
        Alert.alert('Outside District', 'You are outside the district boundary for this canvassing form. You need to be within the boundaries of '+this.state.geofencename+'.', [{text: 'OK'}], { cancelable: false });
        return;
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
    const { myPosition, form } = this.state;

    let jsonStreet = this.refs.formStreet.getValue();
    let jsonCity = this.refs.formCity.getValue();
    let jsonState = this.refs.formState.getValue();

    if (jsonStreet === null || jsonCity === null || jsonState === null) return;

    try {
      await this.map.getMapRef().animateToCoordinate(myPosition, 500)
    } catch (error) {}

    let epoch = this.getEpoch();
    let fAddress = {
      street: jsonStreet.street.trim(),
      multi_unit: jsonCity.multi_unit,
      city: jsonCity.city.trim(),
      state: jsonState.state.trim(),
      zip: jsonState.zip.trim(),

    };
    let address = [fAddress.street, fAddress.city, fAddress.state, fAddress.zip];
    let node = {
      type: "address",
      id: sha1(JSON.stringify(address)),
      latlng: {latitude: myPosition.latitude, longitude: myPosition.longitude},
      address: address,
      multi_unit: jsonCity.multi_unit,
    };

    node = await this._addNode(node);

    this.setState({ fAddress: fAddress, pAddress: fAddress, isModalVisible: false });
    this.doMarkerPress(node);
  }

  doMarkerPress(node) {
    const { navigate } = this.props.navigation;

    this.setState({currentNode: node});

    if (node.multi_unit === true)
      navigate('ListMultiUnit', {refer: this, node: node});
    else
      this.setState({isKnockMenuVisible: true});
  }

  _addNode(node) {
    let epoch = this.getEpoch();

    node.updated = epoch;
    node.canvasser = 'You';
    if (!node.id) node.id = sha1(epoch+JSON.stringify(node)+this.state.currentNode.id);

    let dupe = this.getNodeById(node.id);
    if (!dupe.id) node.created = epoch;
    else {
      // prevent overwriting latlng info with null
      if (dupe.latlng && (node.latlng.latitude === null || node.latlng.longitude === null))
        node.latlng = dupe.latlng;
    }

    this.myNodes[node.id] = node;
    this.allNodes[node.id] = node;

    this._saveNodes(this.myNodes);

    return node;
  }

  ucFirst(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getLastInteraction(id) {
    let nodes = this.getChildNodesByIdTypes(id, ["survey", "import"]);
    const timeAgo = new TimeAgo('en-US')
    let str;

    if (nodes.length)  {
      let last = nodes[0];
      if (last.type === "survey") {
        // App was released in early 2018 with timestamps in seconds
        // If the timestamp is earlier than that, assume it's in seconds and convert to milliseconds
        if (last.updated < 1514764801000) last.updated *= 1000;
        str = this.ucFirst(last.status)+' '+timeAgo.format(new Date(last.updated));
      }
      else
        str = "Haven't visited";
    } else {
      str = "Haven't visited";
    }

    return str;
  }

  getLatestSurveyInfo(id) {
    let nodes = this.getChildNodesByIdTypes(id, ["survey", "import"]);

    for (let n in nodes) {
      let node = nodes[n];
      if (node.survey) return node.survey;
    }

    return {};
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

  _getNodesAsyncStorage = async () => {
    try {
      const value = await storage.get(this.state.asyncStorageKey);
      if (value !== null) {
        this.myNodes = JSON.parse(value);
        this.allNodes = this.myNodes;
      }
    } catch (e) {}

    this.updateMarkers();

    await this._syncNodes(false);

  }

  updateMarkers() {
    let nodes = [];
    let nodeList;

    nodeList = this.mergeNodes([this.allNodes]);

    for (let n in nodeList) {
      let node = nodeList[n];
      if (node.type === "address" && node.latlng
        && !Number.isNaN(node.latlng.longitude) && !Number.isNaN(node.latlng.latitude)) {
        node.location = node.latlng; // supercluster expects latlng to be "location"
        nodes.push(node);
      }
    }

    this.setState({markers: nodes});
  }

  nodeHasSurvey(node) {
    let children = this.getChildNodesByIdTypes(node.id, ["survey"]);
    if (children.length === 0) return false;
    return true;
  }

  timeFormat(epoch) {
    let date = new Date(epoch);
    return date.toLocaleDateString('en-us')+" "+date.toLocaleTimeString('en-us');
  }

  _saveNodes = async (nodes) => {
    this.myNodes = nodes;

    try {
      await storage.set(this.state.asyncStorageKey, JSON.stringify(nodes));
    } catch (error) {
      console.warn(error);
    }

    this.updateMarkers();

    if (this.syncingOk() && !this.state.syncRunning) this._syncNodes(false);
  }

  mergeNodes(stores, time) {
    let nodes = {};

    for (let s in stores) {
      let store = stores[s];
      for (let n in store) {
        let node = store[n];
        if (!nodes[node.id]) nodes[node.id] = node;
        else {
          if (node.updated > nodes[node.id].updated) nodes[node.id] = node;
        }
        if (nodes[node.id].parent_id) {
          if (!this.family[nodes[node.id].parent_id])
            this.family[nodes[node.id].parent_id] = [];

          if (this.fidx.indexOf(node.id) === -1) {
            this.fidx.push(node.id);
            this.family[nodes[node.id].parent_id].push(node);
          }
        }
      }
    }

    // if given a time, sort out everything older than it
    if (time) for (let n in nodes) if (nodes[n].updated < time) delete nodes[n];

    // sort everything in family
    for (let f in this.family) {
      this.family[f] = this.family[f].sort(this.dynamicSort("updated"));
    }

    return nodes;
  }

  _syncNodes = async (flag) => {
    let ret;

    if (this.state.syncRunning === true) return;

    this.setState({syncRunning: true});

    ret = await this._syncServer();

    this.setState({syncRunning: false});
    this.updateMarkers();

    if (flag) {
      if (ret.error) {
        Alert.alert('Error', 'Unable to sync with the server'+(ret.msg?': '+ret.msg:'.'), [{text: 'OK'}], { cancelable: false });
      } else {
        Alert.alert('Success', 'Data sync successful!', [{text: 'OK'}], { cancelable: false });
      }
    }

  }

  _syncServer = async () => {
    let ret = {error: false};

    let store = {
      formId: this.state.form.id,
      last_sync: this.state.last_sync,
      nodes: this.mergeNodes([this.myNodes], this.state.last_sync)
    };

    try {
      let res = await fetch('https://'+this.state.server+API_BASE_URI+'/data/get', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+await _getApiToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(store)
      });

      let json = await res.json();

      if (res.status !== 200 || json.error === true) {
        if (json.msg) ret.msg = json.msg;
        throw "Sync error";
      }

      this.allNodes = this.mergeNodes([this.allNodes,this.myNodes,json.nodes]);
      this.setState({last_sync: new Date().getTime()});
    } catch (e) {
      ret.error = true;
      console.warn('error: '+e);
    }

    return ret;
  }

  getNodeById(id) {
    return (this.allNodes[id] ? this.allNodes[id] : {});
  }

  getChildNodesByIdTypes(id, types) {
    let nodes = [];

    if (!this.family[id]) return nodes;

    for (let c in this.family[id]) {
      let node = this.family[id][c];
      if (types.indexOf(node.type) !== -1) {
        nodes.unshift(node);
      }
    }

    return nodes;
  }

  dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
      var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
      return result * sortOrder;
    }
  }

  getPinColor(node) {
    if (node.multi_unit) return "cyan";

    nodes = this.getChildNodesByIdTypes(node.id, ["survey"]);

    // no interactions
    if (nodes.length === 0) return "#8b4513";

    switch (nodes[0].status) {
      case 'home': return "green";
      case 'not home': return "yellow";
      case 'not interested': return "red";
    }

    return "#8b4513";
  }

  getLastStatus(node) {
    if (node.multi_unit) return "multi-unit";

    nodes = this.getChildNodesByIdTypes(node.id, ["survey"]);

    // no interactions
    if (nodes.length === 0) return "not visited";

    switch (nodes[0].status) {
      case 'home':
      case 'not home':
      case 'not interested':
        return nodes[0].status;
    }

    return "not visited";
  }

  _canvassGuidelinesUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/HelloVoter/blob/master/docs/Canvassing-Guidelines.md";
    return Linking.openURL(url).catch(() => null);
  }

  render() {
    const { navigate } = this.props.navigation;
    const {
      showDisclosure, myPosition, myNodes, locationAccess, serviceError, form, user,
      fAddress, loading, dbx, region,
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

/*
    // TODO: onRegionChangeComplete() to update region lags supercluster real bad,
             so omitting this for now
    let landmarks = [];

    if (region.longitudeDelta < 0.035) landmarks = [{
      id: "spacex",
      landmark: true,
      image: "../../../img/spacexfh.png",
      latlng: { latitude: 33.9208231, longitude: -118.3281370 },
      location: { latitude: 33.9208231, longitude: -118.3281370 },
      address: ["1 Rocket Road", "Hawthorne", "CA", "90250"],
    }];
*/

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

            this.map.getMapRef().animateToRegion({
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
          {geofence.map((polygon, idx) => <Polygon key={idx} coordinates={polygon} strokeWidth={2} fillColor="rgba(0,0,0,0)" />)}
          {this.state.markers.map((marker) => {
            return (
              <MapView.Marker
                key={marker.id}
                coordinate={marker.latlng}
                pinColor={this.getPinColor(marker)}>
                <MapView.Callout onPress={() => this.doMarkerPress(marker)}>
                  <View style={{backgroundColor: '#FFFFFF', padding: 5, width: 175}}>
                    <Text style={{fontWeight: 'bold'}}>{marker.address.join("\n")}</Text>
                    <Text>{(marker.multi_unit ? 'Multi-unit address' : this.getLastInteraction(marker.id))}</Text>
                  </View>
                </MapView.Callout>
              </MapView.Marker>
          )})}
        </MapView>
        }

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.iconContainer}
            onPress={() => {this.showConfirmAddress();}}>
            <Icon
              name="map-marker"
              testID="map-marker"
              size={50}
              color="#8b4513"
              {...iconStyles} />
          </TouchableOpacity>

          {nomap_content.length == 0 &&
          <TouchableOpacity style={styles.iconContainer}
            onPress={() => this.map.getMapRef().animateToCoordinate(myPosition, 1000)}>
            <Icon
              name="location-arrow"
              size={50}
              color="#0084b4"
              {...iconStyles} />
          </TouchableOpacity>
          }

        </View>

        <Modal
          open={this.state.isModalVisible}
          modalStyle={{width: 350, height: 400, backgroundColor: "transparent",
            position: 'absolute', top: (Platform.OS === 'android'?0:100), left: 0, right: 0, bottom: 0}}
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
                      onPress={() => {this.showConfirmAddress();}}>
                      <Text style={{textAlign: 'center'}}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Form
                 ref="formStreet"
                 type={formStreet}
                 onChange={this.onChange}
                 value={fAddress}
                />
                <Form
                 ref="formCity"
                 type={formCity}
                 onChange={this.onChange}
                 options={formOptRow}
                 value={fAddress}
                />
                <Form
                 ref="formState"
                 type={formState}
                 onChange={this.onChange}
                 options={formOptRow}
                 value={fAddress}
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
