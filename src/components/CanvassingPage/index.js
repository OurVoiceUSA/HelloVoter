import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  ScrollView,
  PermissionsAndroid,
  Platform,
  TouchableHighlight,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  DeviceEventEmitter,
} from 'react-native';

import { NavigationActions } from 'react-navigation'
import { Dropbox } from 'dropbox';
import DeviceInfo from 'react-native-device-info';
import storage from 'react-native-storage-wrapper';
import Icon from 'react-native-vector-icons/FontAwesome';
import sha1 from 'sha1';
import Permissions from 'react-native-permissions';
import RNGLocation from 'react-native-google-location';
import RNGooglePlaces from 'react-native-google-places';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import encoding from 'encoding';
import { transliterate as tr } from 'transliteration/src/main/browser';
import { _doGeocode } from '../../common';
import DropboxSharePage from '../DropboxSharePage';
import KnockPage from '../KnockPage';
import Modal from 'react-native-simple-modal';
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import t from 'tcomb-form-native';

TimeAgo.locale(en);

var Form = t.form.Form;

var mainForm = t.struct({
  'street': t.String,
  'multi_unit': t.Boolean,
  'city': t.String,
  'state': t.String,
  'zip': t.String,
});

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      exportRunning: false,
      syncRunning: false,
      serviceError: null,
      locationAccess: null,
      myPosition: {latitude: null, longitude: null},
      currentNode: null,
      fAddress: {},
      myNodes: { nodes: [], last_synced: 0 },
      turfNodes: { nodes: [] },
      asyncStorageKey: 'OV_CANVASS_PINS@'+props.navigation.state.params.form.id,
      DisclosureKey : 'OV_DISCLOUSER',
      isModalVisible: false,
      isKnockMenuVisible: false,
      showDisclosure: "true",
      DropboxShareScreen: false,
      dbx: props.navigation.state.params.dbx,
      form: props.navigation.state.params.form,
      user: props.navigation.state.params.user,
    };

    this.onChange = this.onChange.bind(this);
  }

  onLocationChange (e: Event) {
    let { myPosition } = this.state;
    myPosition = {
      latitude: e.Latitude,
      longitude: e.Longitude,
    };
    this.setState({ myPosition });
  }

  requestLocationPermission = async () => {

    access = false;

    try {
      res = await Permissions.request('location');
      if (res === "authorized") access = true;
    } catch(error) {
      // nothing we can do about it
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
        this.getLocation();
        this.timerID = setInterval(() => this.getLocation(), 5000);
      }
    }

    this.setState({ locationAccess: access });
  }
  componentDidMount() {
    this.requestLocationPermission();
    this._getNodesAsyncStorage();
  this.LoadDisclosure(); //Updates showDisclosure state if the user previously accepted
  }

  getLocation() {
    navigator.geolocation.getCurrentPosition((position) => {
      this.setState({ myPosition: position.coords });
    },
    (error) => { },
    { enableHighAccuracy: true, timeout: 2000, maximumAge: 1000 });
  }

  componentWillUnmount() {
    if (Platform.OS === 'ios') {
      clearInterval(this.timerID);
    } else {
      if (this.evEmitter) {
        RNGLocation.disconnect();
        this.evEmitter.remove();
      }
    }
  }

  showConfirmAddress() {
    const { myPosition } = this.state;

    this.setState({
      loading: true,
      isModalVisible: true,
    });

    setTimeout(async () => {
      try {
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
    return Math.floor(new Date().getTime() / 1000)
  }

  doConfirmAddress = async () => {
    const { myPosition, myNodes, form } = this.state;

    let json = this.refs.mainForm.getValue();
    if (json == null) return;

    try {
      await this.map.animateToCoordinate(myPosition, 500)
    } catch (error) {}

    let epoch = this.getEpoch();
    let address = [json.street, json.city, json.state, json.zip];
    let node = {
      type: "address",
      id: sha1(JSON.stringify(address)),
      latlng: {latitude: myPosition.latitude, longitude: myPosition.longitude},
      address: address,
      multi_unit: json.multi_unit,
    };

    node = this._addNode(node);
    this.setState({ fAddress: json, isModalVisible: false });
    this.doMarkerPress(node);
  }

  doMarkerPress(node) {
    const { navigate } = this.props.navigation;

    if (node.multi_unit === true)
      navigate('ListMultiUnit', {refer: this, node: node});
    else
      this.setState({isKnockMenuVisible: true, currentNode: node});
  }

  _addNode(node) {
    let { myNodes } = this.state;
    let epoch = this.getEpoch();

    node.created = epoch;
    node.updated = epoch;
    if (!node.id) node.id = sha1(epoch+JSON.stringify(node)+this.state.currentNode.id);

    // chech for duplicate address pins
    let check = this.getNodeByIdStore(node.id, myNodes);

    if (!check.id)
      myNodes.nodes.push(node);
    else
      node = check;

    this._saveNodes(myNodes, true);

    return node;
  }

  getLatestSurvey(id) {
    let nodes = this.getChildNodesByIdType(id, "survey").sort(this.dynamicSort('updated'));
    let info = {};
    const timeAgo = new TimeAgo('en-US')

    if (nodes.length)  {
      let last = nodes[nodes.length-1];
      if (last.survey) {
        info.FullName = last.survey.FullName;
        info.PartyAffiliation = last.survey.PartyAffiliation;
      }
      info.LastVisted = timeAgo.format(new Date(last.updated*1000));
    };

    return info;
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

  _nodesFromJSON(str) {
    let store;

    try {
      store = JSON.parse(str);
    } catch (e) { console.warn(e); }

    if (!store.nodes) store.nodes = [];

    // check for old version 1 format and convert
    if (store.pins) {
      for (let p in store.pins) {
        let pin = store.pins[p];

        // address had "unit" in it - splice it out
        let unit = pin.address.splice(1, 1);
        // "city" started with a space... a bug
        pin.address[1] = pin.address[1].trim();

        // ensure latlng aren't strings
        if (pin.latlng) {
          pin.latlng.longitude = parseFloat(pin.latlng.longitude);
          pin.latlng.latitude = parseFloat(pin.latlng.latitude);
        }

        let id = sha1(JSON.stringify(pin.address));
        let pid = id;

        // chech for duplicate address pins
        let check = this.getNodeById(id);

        if (!check.id) {
          store.nodes.push({
            type: "address",
            id: id,
            created: pin.id,
            updated: pin.id,
            latlng: pin.latlng,
            address: pin.address,
            multi_unit: ((unit && unit[0] !== null && unit[0] !== "")?true:false),
          });
        }

        if (unit && unit[0] !== null && unit[0] !== "") {
          id = sha1(pid+unit);
          store.nodes.push({
            type: "unit",
            id: id,
            created: pin.id,
            updated: pin.id,
            parent_id: pid,
            unit: unit[0],
          });
        }

        if (pin.survey) {
          let status = '';
          switch (pin.color) {
            case 'green': status = 'home'; break;
            case 'yellow': status = 'not home'; break;
            case 'red': status = 'not interested'; break;
          }

          store.nodes.push({
            type: "survey",
            id: sha1(id+JSON.stringify(pin.survey)+id),
            parent_id: id,
            created: pin.id,
            updated: pin.id,
            status: status,
            survey: pin.survey,
          });
        }
      }

      delete store.pins;
    }
    return store;
  }

  _getNodesAsyncStorage = async () => {
    const { dbx, form } = this.state;
    try {
      const value = await storage.get(this.state.asyncStorageKey);
      if (value !== null) {
        this.setState({ myNodes: this._nodesFromJSON(value) });
      } else {
        // look on dropbox to see if this device has data that was cleared locally
        try {
          let data = await dbx.filesDownload({ path: form.folder_path+'/'+DeviceInfo.getUniqueID()+'.jtxt' });
          let myNodes = this._nodesFromJSON(data.fileBinary);
          this.setState({ myNodes });
          this._saveNodes(myNodes, true);
        } catch (error) {}
      }

      // look on dropbox for turf
      try {
        let data = await dbx.filesDownload({ path: form.folder_path+'/'+DeviceInfo.getUniqueID()+'.jtrf' });
        let turfNodes = this._nodesFromJSON(data.fileBinary);
        this.setState({ turfNodes: turfNodes });
      } catch (error) {}

    } catch (error) {
      console.warn(error);
    }
  }

  timeFormat(epoch) {
    let date = new Date(epoch*1000);
    return date.toLocaleDateString('en-us')+" "+date.toLocaleTimeString('en-us');
  }

  _saveNodes = async (myNodes, local) => {
    let { dbx } = this.state;
    if (local) myNodes.last_saved = this.getEpoch();
    this.setState({myNodes: myNodes});
    try {
      let str = JSON.stringify(myNodes);
      await storage.set(this.state.asyncStorageKey, str);
    } catch (error) {
      console.warn(error);
    }
  }

  _syncNodes = async (flag) => {
    let { dbx, form, user, myNodes } = this.state;

    if (myNodes.last_synced > myNodes.last_saved) return;

    this.setState({syncRunning: true});

    let last_synced = myNodes.last_synced;
    myNodes.last_synced = this.getEpoch();
    myNodes.canvasser = user.dropbox.name.display_name;

    try {
      let str = JSON.stringify(myNodes);
      await dbx.filesUpload({ path: form.folder_path+'/'+DeviceInfo.getUniqueID()+'.jtxt', contents: encoding.convert(tr(str), 'ISO-8859-1'), mode: {'.tag': 'overwrite'} });
      this._saveNodes(myNodes, false);
      Alert.alert('Success', 'Data sync successful!', [{text: 'OK'}], { cancelable: false });
    } catch (error) {
      if (flag) Alert.alert('Error', 'Unable to sync with the server.', [{text: 'OK'}], { cancelable: false });
      myNodes.last_synced = last_synced;
    }

    this.setState({syncRunning: false, myNodes: myNodes});
  }

  getNodeById(id) {
    let merged = {nodes: []};

    merged.nodes = this.state.myNodes.nodes.concat(this.state.turfNodes.nodes);

    return this.getNodeByIdStore(id, merged);
  }

  getNodeByIdStore(id, store) {
    for (let i in store.nodes) {
      let node = store.nodes[i];
      if (node.id === id) {
        // if we have a parent_id, recursively merge properties. This makes "unit" a polymorph of "address"
        if (node.parent_id) {
          let pid = node.parent_id;
          delete node.parent_id;
          Object.assign(node, this.getNodeByIdStore(pid, store));
        }
        return node;
      }
    }
    return {};
  }

  updateNodeById(id, prop, value) {
    let store = this.state.myNodes;
    let merged = {nodes: []};

    merged.nodes = store.nodes.concat(this.state.turfNodes.nodes);

    for (let i in merged.nodes) {
      let node = merged.nodes[i];
      if (node.id === id) {
        // check if this ID is in the myNodes stora
        let check = this.getNodeByIdStore(node.id, store);

        if (!check.id) {
          this._addNode(node);
        } else {
          node[prop] = value;
          node.updated = this.getEpoch();
          this._saveNodes(store, true);
        }
      }
    }
  }

  getNodesbyType(type) {
    let store = this.state.myNodes;
    let merged = {nodes: []};

    merged.nodes = store.nodes.concat(this.state.turfNodes.nodes);

    let nodes = [];
    for (let i in merged.nodes) {
      let node = merged.nodes[i];
      if (node.type === type)
        nodes.push(node);
    }
    return nodes;
  }

  getChildNodesByIdType(id, type) {
    let store = this.state.myNodes;
    let merged = {nodes: []};

    merged.nodes = store.nodes.concat(this.state.turfNodes.nodes);

    let nodes = [];
    for (let i in merged.nodes) {
      let node = merged.nodes[i];
      if (node.parent_id === id && node.type === type) {
        nodes.push(node);
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

    nodes = this.getChildNodesByIdType(node.id, "survey").sort(this.dynamicSort('updated'));

    // no interactions
    if (nodes.length === 0) return "#8b4513";

    switch (nodes[nodes.length-1].status) {
      case 'home': return "green";
      case 'not home': return "yellow";
      case 'not interested': return "red";
    }

    return "#8b4513";
  }

  doExport = async () => {
    let { dbx, form } = this.state;

    let allNodes = {nodes: []};

    this.setState({exportRunning: true});
    await this._syncNodes(false);

    // download all sub-folder .jtxt files
    let folders = [];
    let jtxtfiles = [];
    try {
      let res = await dbx.filesListFolder({path: form.folder_path});
      for (let i in res.entries) {
        item = res.entries[i];
        // any devices logged in with the form creator are here
        if (item.path_display.match(/\.jtxt$/)) {
          let data = await dbx.filesDownload({ path: item.path_display });
          jtxtfiles.push(this._nodesFromJSON(data.fileBinary));
        }
        if (item['.tag'] != 'folder') continue;
        folders.push(item.path_display);
      }
    } catch (error) {
      console.warn(error);
    };

    // TODO: do in paralell... let objs = await Promise.all(pro.map(p => p.catch(e => e)));

    // for each folder, download all .jtxt files
    for (let f in folders) {
      try {
        let res = await dbx.filesListFolder({path: folders[f]});
        for (let i in res.entries) {
          item = res.entries[i];
          if (item.path_display.match(/\.jtxt$/)) {
            let data = await dbx.filesDownload({ path: item.path_display });
            jtxtfiles.push(this._nodesFromJSON(data.fileBinary));
          }
        }
      } catch (error) {
        console.warn(error);
      }
    }

    // concat everything into allNodes
    for (let f in jtxtfiles) {
      let obj = jtxtfiles[f];
      // copy canvasser property since it gets lost in the concat
      for (let n in obj.nodes)
        obj.nodes[n].canvasser = obj.canvasser;
      allNodes.nodes = allNodes.nodes.concat(obj.nodes);
    }

    // convert to .csv file and upload
    let keys = Object.keys(form.questions);
    let csv = "Street,City,State,Zip,Unit,longitude,latitude,canvasser,datetime,status,"+keys.join(",")+"\n";
    for (let n in allNodes.nodes) {
      let node = allNodes.nodes[n];
      if (node.type !== "survey") continue;

      let addr = this.getNodeByIdStore(node.parent_id, allNodes);

      csv += (addr.address?addr.address.map((x) => '"'+(x?x:'')+'"').join(','):'')+
        ","+(addr.unit?addr.unit:'')+
        ","+(addr.latlng?addr.latlng.longitude:'')+
        ","+(addr.latlng?addr.latlng.latitude:'')+
        ","+node.canvasser+
        ","+this.timeFormat(node.updated)+
        ","+node.status;
      for (let key in keys) {
        let value = '';
        if (node.survey && node.survey[keys[key]]) value = node.survey[keys[key]];
        csv += ',"'+value+'"';
      }
      csv += "\n";
    }

    try {
      await dbx.filesUpload({ path: form.folder_path+'/'+form.name+'.csv', contents: encoding.convert(tr(csv), 'ISO-8859-1'), mode: {'.tag': 'overwrite'} });
      Alert.alert('Success', 'Data export successful! Check your dropbox account for the spreadsheet.', [{text: 'OK'}], { cancelable: false });
    } catch(error) {
      console.warn(error);
      Alert.alert('Error', 'Unable to export data to the server.', [{text: 'OK'}], { cancelable: false });
    }

    this.setState({ exportRunning: false });

  }

  _canvassUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/OVMobile/blob/master/docs/Canvassing-Guidelines.md";
    return Linking.openURL(url).catch(() => null);
  }

  render() {
    const { navigate } = this.props.navigation;
    const {
      showDisclosure, myPosition, myNodes, locationAccess, serviceError, form, user,
      fAddress, loading, dbx, DropboxShareScreen, exportRunning, syncRunning,
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
                By using this tool you acknowledge that you are acting on your own behalf, do not represent Our Voice Initiative
                or its affiliates, and have read our <Text style={{fontSize: 18, fontWeight: 'bold', color: 'blue'}} onPress={() => {this._canvassUrlHandler()}}>
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
          <Text>Access to your location is disabled.</Text>
          <Text>The map will not render unless you grant location access.</Text>
        </View>
      );
    } else if (serviceError === true) {
      nomap_content.push(
        <View key={1} style={styles.content}>
          <Text>Unable to load location services from your device.</Text>
        </View>
      );
    } else if (myPosition.latitude == null || myPosition.longitude == null) {
      nomap_content.push(
        <View key={1} style={styles.content}>
          <Text>Waiting on location data from your device...</Text>
          <ActivityIndicator />
        </View>
      );
    }

    // toggle pin horizon based on how many we have, for now - TODO: make this a setting
    let markers = this.getNodesbyType("address");

    if (markers.length > 300) {
      markersInView = [];

      for (let m in markers) {
        let marker = markers[m];
        if (marker.latlng && marker.latlng.longitude !== null &&
          Math.hypot(myPosition.longitude-marker.latlng.longitude, myPosition.latitude-marker.latlng.latitude) < 0.025)
          markersInView.push(marker);
      }
    } else {
      markersInView = markers;
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
          initialRegion={{latitude: myPosition.latitude, longitude: myPosition.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005}}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          showsUserLocation={true}
          followsUserLocation={false}
          keyboardShouldPersistTaps={true}
          {...this.props}>
          {
            markersInView.map((marker, index) =>
              marker.latlng.longitude !== null &&
              (
              <MapView.Marker
                key={marker.id}
                coordinate={marker.latlng}
                title={marker.address.join(", ")}
                draggable
                onDragEnd={(e) => {
                  marker.latlng = e.nativeEvent.coordinate;
                  marker.updated = this.getEpoch();
                  this._saveNodes(myNodes, true);
                }}
                pinColor={this.getPinColor(marker)}
                description={(marker.multi_unit?"Multi-unit address":"Single unit address")}
                onCalloutPress={() => {this.doMarkerPress(marker);}}
                />
            ))
          }
        </MapView>
        }
          <View style={{alignSelf: 'flex-end', alignItems: 'flex-end', marginRight: 5}}>
            {user.dropbox.account_id == form.author_id &&
            <View style={{marginBottom: 10}}>
              <Icon name="share-square" size={50} color="#808080" style={{marginBottom: 10}} onPress={() => this.setState({DropboxShareScreen: true})} />
              {exportRunning &&
              <ActivityIndicator size="large" />
              ||
              <Icon name="save" size={50} color="#b20000" onPress={() => this.doExport()} />
              }
            </View>
            }
            {(!myNodes.last_synced || myNodes.last_saved > myNodes.last_synced || (syncRunning && !exportRunning)) &&
              <View style={{marginBottom: 10}}>
              {syncRunning &&
              <ActivityIndicator size="large" />
              ||
              <Icon name="refresh" size={50} color="#00a86b" onPress={() => this._syncNodes(true)} />
              }
              </View>
            }
            {nomap_content.length == 0 &&
            <Icon name="compass" style={{marginBottom: 10}} size={50} color="#0084b4" onPress={() => this.map.animateToCoordinate(myPosition, 1000)} />
            }
            <Icon name="cog" style={{marginBottom: 10}} size={50} color="#808080" onPress={() => {navigate("CanvassingSettingsPage", {refer: this})}} />
            <View style={{backgroundColor: '#FFFFFF', alignItems: 'flex-end', padding: 10, width: 100, height: 55}}>
              <Text>{markers.length} pins</Text>
              <Text>{markersInView.length} in view</Text>
            </View>
          </View>
        <View style={styles.buttonContainer}>
          <Icon.Button
            name="home"
            backgroundColor="#d7d7d7"
            color="#000000"
            onPress={() => {this.showConfirmAddress();}}
            {...iconStyles}>
            Record New Address
          </Icon.Button>
        </View>

        <Modal
          open={this.state.isModalVisible}
          modalStyle={{width: 350, height: 500, backgroundColor: "transparent",
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
                <Text style={{color: 'blue', fontWeight: 'bold', fontSize: 15}}>Confirm the Address</Text>
                <Form
                 ref="mainForm"
                 type={mainForm}
                 onChange={this.onChange}
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
          <KnockPage refer={this} funcs={this} />
        </Modal>

        <Modal
          open={DropboxShareScreen}
          modalStyle={{width: 335, height: 250, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({DropboxShareScreen: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <DropboxSharePage refer={this} />
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
