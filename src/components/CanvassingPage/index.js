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
import KnockPage from '../KnockPage';
import Modal from 'react-native-simple-modal';
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import t from 'tcomb-form-native';
import _ from 'lodash';

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

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      netInfo: 'none',
      exportRunning: false,
      syncRunning: false,
      serviceError: null,
      locationAccess: null,
      myPosition: {latitude: null, longitude: null},
      region: {latitudeDelta: 0.004, longitudeDelta: 0.004},
      currentNode: null,
      fAddress: {},
      asyncStorageKey: 'OV_CANVASS_PINS@'+props.navigation.state.params.form.id,
      settingsStorageKey: 'OV_CANVASS_SETTINGS',
      canvassSettings: {},
      DisclosureKey : 'OV_DISCLOUSER',
      isModalVisible: false,
      isKnockMenuVisible: false,
      isAlertMenuVisible: false,
      showDisclosure: "true",
      dbx: props.navigation.state.params.dbx,
      form: props.navigation.state.params.form,
      user: props.navigation.state.params.user,
    };

    this.markers = [];
    this.myNodes = {};
    this.turfNodes = {};
    this.allNodes = {};

    this.family = {};
    this.fidx = [];

    this.alerts = [];

    this.onChange = this.onChange.bind(this);
    this.handleConnectivityChange = this.handleConnectivityChange.bind(this);
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
        this.getLocation();
        this.timerID = setInterval(() => this.getLocation(), 5000);
      }
    }

    this.setState({ locationAccess: access });
  }

  componentDidMount() {
    this.requestLocationPermission();
    this.setupConnectionListener();
    this._getCanvassSettings();
    this._getNodesAsyncStorage();
    this.LoadDisclosure(); //Updates showDisclosure state if the user previously accepted
  }

  getLocation() {
    navigator.geolocation.getCurrentPosition((position) => {
      // if this was the first call to getLocation (previous state null), an iOS bug renders in the ocean
      // force the map to center to the correct place
      try {
        if (position.coords.latitude !== null && this.state.myPosition.latitude === null)
          setTimeout(() => {
            try {
              this.map.animateToRegion((Object.assign({}, this.state.region, position.coords)), 1);
            } catch (e) {}
          }, 100);
      } catch(e) {}

      this.setState({ myPosition: position.coords });
    },
    (error) => { },
    { enableHighAccuracy: true, timeout: 2000, maximumAge: 1000 });
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
          // TODO: this doesn't trigger a sync when you first open the app, only because settings aren't loaded yet
          //       need more rubost state change logic
          if (this.state.canvassSettings.auto_sync && !this.state.syncRunning) this._syncNodes(false);
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
    if (this.state.canvassSettings.sync_on_cellular !== true && this.state.netInfo !== 'wifi') return false;
    return true;
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
    NetInfo.removeEventListener(
      'connectionChange',
      this.handleConnectivityChange
    );
  }

  showConfirmAddress() {
    const { myPosition } = this.state;

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
    return Math.floor(new Date().getTime() / 1000)
  }

  doConfirmAddress = async () => {
    const { myPosition, form } = this.state;

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

    this.setState({ fAddress: fAddress, isModalVisible: false });
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
    node.canvasser = this.state.user.dropbox.name.display_name;
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
      if (last.type === "survey")
        str = this.ucFirst(last.status)+' '+timeAgo.format(new Date(last.updated*1000));
      else
        str = "Haven't visited";
    } else {
      str = "Haven't visited";
    }

    return str;
  }

  getLatestSurveyInfoByProp(id, prop) {
    let nodes = this.getChildNodesByIdTypes(id, ["survey", "import"]);

    for (let n in nodes) {
      let node = nodes[n];
      if (node.survey && node.survey[prop]) return node.survey;
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

  _nodesFromJSON(str) {
    let store;

    try {
      store = JSON.parse(str);
    } catch (e) { console.warn(e); }

    if (!store.nodes) store.nodes = {};

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

        if (!store.nodes[id]) {
          store.nodes[id] = {
            type: "address",
            id: id,
            created: pin.id,
            updated: pin.id,
            canvasser: store.canvasser,
            latlng: pin.latlng,
            address: pin.address,
            multi_unit: ((unit && unit[0] !== null && unit[0] !== "")?true:false),
          };
        }

        if (unit && unit[0] !== null && unit[0] !== "") {
          id = sha1(pid+unit[0]);
          store.nodes[id] = {
            type: "unit",
            id: id,
            parent_id: pid,
            created: pin.id,
            updated: pin.id,
            canvasser: store.canvasser,
            unit: unit[0],
          };
        }

        let status = '';
        switch (pin.color) {
          case 'green': status = 'home'; break;
          case 'yellow': status = 'not home'; break;
          case 'red': status = 'not interested'; break;
        }

        let survey_id = sha1(id+JSON.stringify(pin.survey)+pin.id);

        store.nodes[survey_id] = {
          type: "survey",
          id: survey_id,
          parent_id: id,
          created: pin.id,
          updated: pin.id,
          canvasser: store.canvasser,
          status: status,
          survey: pin.survey,
        };
      }

    }

    return store.nodes;
  }

  _getNodesAsyncStorage = async () => {
    try {
      const value = await storage.get(this.state.asyncStorageKey);
      if (value !== null) {
        this.myNodes = this._nodesFromJSON(value);
        this.allNodes = this.myNodes;
      }
    } catch (e) {}

    this.updateMarkers();

    // even if sycn isn't OK over cellular - do the initial sync anyway
    await this._syncNodes(false);

    this.updateMarkers();
  }

  updateMarkers() {
    let nodes = [];
    let nodeList;

    if (this.state.canvassSettings.show_only_my_turf === true)
      nodeList = this.mergeNodes([this.turfNodes, this.myNodes]);
    else
      nodeList = this.mergeNodes([this.allNodes]);

    for (let n in nodeList) {
      let node = nodeList[n];
      if (node.type === "address")
        nodes.push(node);
    }

    this.markers = nodes;
    this.forceUpdate();
  }

  nodeHasSurvey(node) {
    let children = this.getChildNodesByIdTypes(node.id, ["survey"]);
    if (children.length === 0) return false;
    return true;
  }

  alertPush(spec) {
    this.alerts.push(spec);
    this.setState({isAlertMenuVisible: true});
  }

  alertOnPress(func) {
    func();
    this.setState({isAlertMenuVisible: false});
    this.alerts.shift();
    if (this.alerts.length) setTimeout(() => this.setState({isAlertMenuVisible: true}), 500);
  }

  _getCanvassSettings = async () => {
    let canvassSettings = {};
    try {
      const value = await storage.get(this.state.settingsStorageKey);
      if (value !== null) {
        canvassSettings = JSON.parse(value);
        this.setState({ canvassSettings });
      }
    } catch (e) {
      // don't continue with the below questions on storage fetch error
      return;
    }

    if (canvassSettings.sync_on_cellular !== true && canvassSettings.asked_sync_on_cellular !== true)
      this.alertPush({
        title: 'Sync over cellular',
        description: 'Would you like to enable syncing of your data over your cellular connection?',
        funcs: [
          {text: 'Yes', onPress: async () => {
            let { canvassSettings } = this.state;
            canvassSettings.asked_sync_on_cellular = true;
            canvassSettings.sync_on_cellular = true;
            await this._setCanvassSettings(canvassSettings);
          }},
          {text: 'No', onPress: async () => {
            let { canvassSettings } = this.state;
            canvassSettings.asked_sync_on_cellular = true;
            await this._setCanvassSettings(canvassSettings);
          }},
        ]
      });

    if (canvassSettings.auto_sync !== true && canvassSettings.asked_auto_sync !== true)
      this.alertPush({
        title: 'Automatially sync data',
        description: 'Would you like your data to automatically sync as you canvass, if a data connection is available?',
        funcs: [
          {text: 'Yes', onPress: async () => {
            let { canvassSettings } = this.state;
            canvassSettings.asked_auto_sync = true;
            canvassSettings.auto_sync = true;
            await this._setCanvassSettings(canvassSettings);
          }},
          {text: 'No', onPress: async () => {
            let { canvassSettings } = this.state;
            canvassSettings.asked_auto_sync = true;
            await this._setCanvassSettings(canvassSettings);
          }},
        ]
      });

  }

  _setCanvassSettings = async (canvassSettings) => {
    const { form, dbx } = this.state;

    let rmshare = false;

    if (this.state.canvassSettings.share_progress !== canvassSettings.share_progress && canvassSettings.share_progress === false) rmshare = true;

    try {
      let str = JSON.stringify(canvassSettings);
      await storage.set(this.state.settingsStorageKey, str);
      this.setState({canvassSettings});
    } catch (e) {}

    if (rmshare) {
      try {
        let res = await dbx.filesListFolder({path: form.folder_path});
        for (let i in res.entries) {
          item = res.entries[i];
          if (item['.tag'] != 'folder') continue;
          if (item.path_display.match(/@/))
            await dbx.filesDelete({ path: item.path_display+'/exported.jtrf' });
        }
      } catch (e) {}
    }

    if (this.state.canvassSettings.show_only_my_turf !== canvassSettings.how_only_my_turf) this.updateMarkers();
  }

  timeFormat(epoch) {
    let date = new Date(epoch*1000);
    return date.toLocaleDateString('en-us')+" "+date.toLocaleTimeString('en-us');
  }

  strifyNodes(nodes) {
    return JSON.stringify({nodes: nodes});
  }

  _saveNodes = async (nodes) => {
    this.myNodes = nodes;

    try {
      await storage.set(this.state.asyncStorageKey, this.strifyNodes(nodes));
    } catch (error) {
      console.warn(error);
    }

    this.updateMarkers();

    if (this.state.canvassSettings.auto_sync && this.syncingOk() && !this.state.syncRunning) this._syncNodes(false);
  }

  mergeNodes(stores) {
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

    // sort everything in family
    for (let f in this.family) {
      this.family[f] = this.family[f].sort(this.dynamicSort("updated"));
    }

    return nodes;
  }

  _syncNodes = async (flag) => {
    let { dbx, form, user } = this.state;
    let allsrc = [];

    this.setState({syncRunning: true});

    try {
      let res = await dbx.filesListFolder({path: form.folder_path});
      if (res.entries.length === 0) throw "The form's folder is missing!";

      await dbx.filesUpload({ path: form.folder_path+'/'+DeviceInfo.getUniqueID()+'.jtxt', contents: encoding.convert(tr(this.strifyNodes(this.myNodes)), 'ISO-8859-1'), mute: true, mode: {'.tag': 'overwrite'} });

      // download "turf" for this device
      try {
        let data = await dbx.filesDownload({ path: form.folder_path+'/'+DeviceInfo.getUniqueID()+'.jtrf' });
        this.turfNodes = this._nodesFromJSON(data.fileBinary);
      } catch (e) {}

      allsrc.push(this.myNodes);
      allsrc.push(this.turfNodes);

      // download other jtxt files on this account
      res = await dbx.filesListFolder({path: form.folder_path});
      for (let i in res.entries) {
        item = res.entries[i];
        if (item.path_display.match(/\.jtxt$/) && !item.path_display.match(DeviceInfo.getUniqueID())) {
          try {
            let data = await dbx.filesDownload({ path: item.path_display });
            allsrc.push(this._nodesFromJSON(data.fileBinary));
          } catch (e) {}
        }
      }

      // download exported "turf" for this account
      try {
        let data = await dbx.filesDownload({ path: form.folder_path+'/exported.jtrf' });
        allsrc.push(this._nodesFromJSON(data.fileBinary));
      } catch (e) {}

      // extra sync stuff for the form owner
      if (user.dropbox.account_id == form.author_id) {
        // download all sub-folder .jtxt files
        let folders = [];
        let res = await dbx.filesListFolder({path: form.folder_path});
        for (let i in res.entries) {
          item = res.entries[i];
          // any devices logged in with the form creator are here
          if (item['.tag'] != 'folder') continue;
          folders.push(item.path_display);
        }

        // TODO: do in paralell... let objs = await Promise.all(pro.map(p => p.catch(e => e)));

        // for each folder, download all .jtxt files
        for (let f in folders) {
          try {
            let res = await dbx.filesListFolder({path: folders[f]});
            for (let i in res.entries) {
              item = res.entries[i];
              if (item.path_display.match(/\.jtxt$/)) {
                let data = await dbx.filesDownload({ path: item.path_display });
                allsrc.push(this._nodesFromJSON(data.fileBinary));
              }
            }
          } catch (e) {
            console.warn(e);
          }
        }

        let exportedFile = encoding.convert(tr(this.strifyNodes(this.mergeNodes(allsrc))), 'ISO-8859-1');
        await dbx.filesUpload({ path: form.folder_path+'/exported.jtrf', contents: exportedFile, mute: true, mode: {'.tag': 'overwrite'} });

        // copy exported.jtrf to all sub-folders if configured in settings
        if (this.state.canvassSettings.share_progress === true) {
          try {
            let res = await dbx.filesListFolder({path: form.folder_path});
            for (let i in res.entries) {
              item = res.entries[i];
              if (item['.tag'] != 'folder') continue;
              if (item.path_display.match(/@/))
                await dbx.filesUpload({ path: item.path_display+'/exported.jtrf', contents: exportedFile, mute: true, mode: {'.tag': 'overwrite'} });
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }

      if (flag) Alert.alert('Success', 'Data sync successful!', [{text: 'OK'}], { cancelable: false });
    } catch (error) {
      if (flag) Alert.alert('Error', 'Unable to sync with the server.', [{text: 'OK'}], { cancelable: false });
    }

    this.setState({syncRunning: false});

    this.allNodes = this.mergeNodes(allsrc);

    this.updateMarkers();
  }

  getNodeById(id) {
    return (this.allNodes[id] ? this.allNodes[id] : {});
  }

  updateNodeById = async (id, prop, value) => {
    let node = this.getNodeById(id);

    if (!node.id) return;

    node[prop] = value;
    node.updated = this.getEpoch();

    this.myNodes[id] = node;
    this.allNodes[id] = node;

    await this._saveNodes(this.myNodes);
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

  doExport = async (refer) => {
    let { dbx, form } = this.state;

    refer.setState({exportRunning: true});
    let success = false;

    try {
      await this._syncNodes(false);

      // convert to .csv file and upload
      let keys = Object.keys(form.questions);
      let csv = "Street,City,State,Zip,Unit,longitude,latitude,canvasser,datetime,status,"+keys.join(",")+"\n";

      for (let a in this.allNodes) {
        let node = this.allNodes[a];
        if (node.type !== "survey") continue;

        let addr = this.getNodeById(node.parent_id);

        // orphaned survey
        if (!addr.id) continue

        // unit
        if (addr.type === "unit") addr = this.getNodeById(addr.parent_id);

        if (this.state.canvassSettings.only_export_home === true && node.status !== 'home') continue;

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

      // csv file
      await dbx.filesUpload({ path: form.folder_path+'/'+form.name+'.csv', contents: encoding.convert(tr(csv), 'ISO-8859-1'), mute: false, mode: {'.tag': 'overwrite'} });
      success = true;
    } catch(e) {
      console.warn(e);
    }

    refer.setState({ exportRunning: false }, refer.exportDone(success));
  }

  _canvassGuidelinesUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/OVMobile/blob/master/docs/Canvassing-Guidelines.md";
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

    // toggle pin horizon based on zoom level
    let markersInView = [];
    let tooManyMarkers = false;

    for (let m in this.markers) {
      let marker = this.markers[m];
      if (marker.latlng && marker.latlng.longitude !== null &&
        Math.hypot(region.longitude-marker.latlng.longitude, region.latitude-marker.latlng.latitude) < region.longitudeDelta/1.75)
        markersInView.push(marker);

      if (markersInView.length >= 500) {
        tooManyMarkers = true;
        break;
      }
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
          onRegionChangeComplete={(region) => {
            this.setState({region});
          }}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          showsUserLocation={true}
          followsUserLocation={false}
          keyboardShouldPersistTaps={true}
          {...this.props}>
          {markersInView.map((marker) => {
            return (
              <MapView.Marker
                key={marker.id}
                coordinate={marker.latlng}
                draggable={this.state.canvassSettings.draggable_pins}
                onDragEnd={(e) => {
                  this.updateNodeById(marker.id, 'latlng', e.nativeEvent.coordinate);
                }}
                pinColor={this.getPinColor(marker)}>
                  <MapView.Callout onPress={() => {this.doMarkerPress(marker);}}>
                    <View style={{backgroundColor: '#FFFFFF', padding: 5, width: 175}}>
                      <Text style={{fontWeight: 'bold'}}>{marker.address.join("\n")}</Text>
                      <Text>{(marker.multi_unit ? 'Multi-unit address' : this.getLastInteraction(marker.id))}</Text>
                    </View>
                  </MapView.Callout>
                </MapView.Marker>
          )})}
        </MapView>
        }

        <View style={{alignSelf: 'flex-end', alignItems: 'flex-end', marginRight: 5}}>
          <View style={{
              backgroundColor: '#FFFFFF', alignItems: 'flex-end', padding: 8,
              borderColor: '#000000', borderWidth: 2, borderRadius: 10, width: 100, height: 60,
            }}>
            <View>
              <Text>{this.markers.length} pins</Text>
              <Text>{(tooManyMarkers ? 'clustering' : markersInView.length+' in view')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.iconContainer}
            onPress={() => {this.showConfirmAddress();}}>
            <Icon
              name="map-marker"
              size={50}
              color="#8b4513"
              {...iconStyles} />
          </TouchableOpacity>

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

          {this.state.syncRunning &&
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" />
          </View>
          ||
          <View>
            <TouchableOpacity style={styles.iconContainer}
              onPress={() => {
                if (this.state.netInfo === 'none') {
                  Alert.alert('Sync failed.', 'You are not connected to the internet.', [{text: 'OK'}], { cancelable: false });
                } else if (!this.syncingOk()) {
                  Alert.alert('Sync failed.', 'You are not connected to wifi. To sync over your cellular connection, enable \'Sync over cellular\' in settings.', [{text: 'OK'}], { cancelable: false });
                } else {
                  this._syncNodes(true);
                }
              }}>
              <Icon
                name="refresh"
                size={50}
                color={(this.syncingOk() ? "#00a86b" : "#d3d3d3")}
                {...iconStyles} />
            </TouchableOpacity>
          </View>
          }

          <TouchableOpacity style={styles.iconContainer}
            onPress={() => {navigate("CanvassingSettingsPage", {refer: this})}}>
            <Icon
              name="cog"
              size={50}
              color="#808080"
              {...iconStyles} />
          </TouchableOpacity>

        </View>

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
                <Text style={{color: 'blue', fontWeight: 'bold', fontSize: 15}}>Confirm the Address</Text>
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
          open={this.state.isAlertMenuVisible}
          modalStyle={{width: 335, height: 350, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({isAlertMenuVisible: false})}
          closeOnTouchOutside={false}
          disableOnBackPress={true}>
          <View style={{flexDirection: 'column'}}>
            <View style={{width: 325, backgroundColor: 'white', marginTop: 5, borderRadius: 15, padding: 10, alignItems: 'center'}}>
              {this.alerts.length &&
              <View>
              <Text style={{fontWeight: 'bold', fontSize: 20, marginBottom: 10}}>{this.alerts[0].title}</Text>
              <Text>{this.alerts[0].description}</Text>
              <View style={{flexDirection: 'row'}}>
                {this.alerts[0].funcs.map((spec) => (
                  <TouchableOpacity key={spec.text}
                    style={{backgroundColor: '#d7d7d7', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 20, margin: 10, width: 75}}
                    onPress={() => this.alertOnPress(spec.onPress)}>
                    <Text>{spec.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              </View>
            }
            </View>
          </View>
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
