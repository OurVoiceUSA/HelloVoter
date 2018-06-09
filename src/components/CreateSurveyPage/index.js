
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableOpacity,
  TouchableHighlight,
  FlatList,
  Text,
  View,
  DeviceEventEmitter,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';

import t from 'tcomb-form-native';
import Modal from 'react-native-simple-modal';
import storage from 'react-native-storage-wrapper';
import SortableListView from 'react-native-sortable-listview'
import Permissions from 'react-native-permissions';
import RNGLocation from 'react-native-google-location';
import Icon from 'react-native-vector-icons/FontAwesome';
import sha1 from 'sha1';
import encoding from 'encoding';
import { transliterate as tr } from 'transliteration/src/main/browser';
import { Dropbox } from 'dropbox';
import { _apiCall } from '../../common';

var Form = t.form.Form;

const FTYPE = t.enums({
  'String': 'Text Input',
  'TEXTBOX': 'Large Text Box',
  'Number': 'Number',
  'Boolean': 'On/Off Switch',
  'SAND': 'Agree/Disagree',
//  'List': 'Select from List',
}, 'FTYPE');

var addItem = {
  key: t.String,
  label: t.String,
  type: FTYPE,
};

var options = {
  fields: {
    key: {
      label: 'Input Key',
      help: 'The spreadsheet column name.',
    },
    label: {
      label: 'Input Label',
      help: 'Label the user sees on the form.',
    },
    type: {
      help: 'The type of input the user can enter.',
    },
  },
};

var premade = {
  'FullName': { label: 'Full Name', type: 'String', optional: true },
  'Email': { label: 'Email Address', type: 'String', optional: true },
  'RegisteredToVote': { label: 'Are you registered to vote?', type: 'Boolean', optional: true },
  'PartyAffiliation': { label: 'Party Affiliation', type: 'List', optional: true,
    options: [
      'No Party Preference',
      'Democrat',
      'Republican',
      'Green',
      'Libertarian',
      'Other',
    ]},
};

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    const { state } = this.props.navigation;

    let fields;
    let order;
    let edit = false;

    if (props.navigation.state.params.form !== null) {
      fields = props.navigation.state.params.form.questions;
      order = props.navigation.state.params.form.questions_order;
      if (!order) order = Object.keys(fields);
      edit = true;
      this.mainForm = t.struct({});
    } else {
      fields = JSON.parse(JSON.stringify(premade)); // deep copy
      order = Object.keys(fields);
      this.mainForm = t.struct({
        'name': t.String,
      });
    }

    this.state = {
      refer: props.navigation.state.params.refer,
      user: props.navigation.state.params.refer.state.user,
      dbx: props.navigation.state.params.refer.state.dbx,
      info: {},
      customForm: null,
      geofence: null,
      geofenceModal: false,
      loading: false,
      myPosition: {
        latitude: null,
        longitude: null,
      },
      state: null,
      stategeo: null,
      cd: null,
      cdgeo: null,
      form: props.navigation.state.params.form,
      fields: fields,
      order: order,
      edit: edit,
      saving: false,
    };

    this.onChange = this.onChange.bind(this);
    this.onChangeName = this.onChangeName.bind(this);
    this.doAddCustom = this.doAddCustom.bind(this);
    this.doSave = this.doSave.bind(this);
    this.doShowCustom = this.doShowCustom.bind(this);
  }

  componentWillUnmount() {
    if (Platform.OS === 'android' && this.evEmitter) {
      RNGLocation.disconnect();
      this.evEmitter.remove();
    }
  }

  onLocationChange (e: Event) {
    this.setLocation(e.Longitude, e.Latitude);
  }

  getLocation() {
    navigator.geolocation.getCurrentPosition((position) => {
      this.setLocation(position.coords.longitude, position.coords.latitude);
    },
    (error) => { this._genericServiceError(error, "Unable to retrieve your location from your device."); },
    { enableHighAccuracy: true, timeout: 2000, maximumAge: 1000 });
  }

  setLocation = async (lng, lat) => {
    let state;
    let stategeo;
    let cd;
    let cdgeo;

    try {
      let res = await _apiCall('/api/v1/whorepme?lng='+lng+'&lat='+lat, {});
      let body = await res.json();

      if (body.cd && body.cd[0]) {
        state = body.cd[0].state;
        cd = body.cd[0].district;

        res = await fetch('https://raw.githubusercontent.com/OurVoiceUSA/districts/gh-pages/states/'+state+'/shape.geojson');
        stategeo = await res.json();

        res = await fetch('https://raw.githubusercontent.com/OurVoiceUSA/districts/gh-pages/cds/2016/'+state+'-'+cd+'/shape.geojson');
        cdgeo = await res.json();
      }

    } catch (e) {
      console.warn(e);
    }

    this.setState({
      state, stategeo, cd, cdgeo,
      myPosition: {
        latitude: lat,
        longitude: lng,
      },
      loading: false,
    });

    if (this.evEmitter) {
      RNGLocation.disconnect();
      this.evEmitter.remove();
      this.evEmitter = null;
    }
  }

  showGeofenceModal = async () => {
    access = false;

    this.setState({geofenceModal: true, loading: true});

    try {
      res = await Permissions.request('location');
      if (res === "authorized") access = true;
    } catch(error) {
      // nothing we can do about it
    }
    if (access === true) {
      if (Platform.OS === 'android') {
        if (RNGLocation.available() !== false) {
          if (!this.evEmitter) {
            this.evEmitter = DeviceEventEmitter.addListener('updateLocation', this.onLocationChange.bind(this));
            RNGLocation.reconnect();
            RNGLocation.getLocation();
          }
        }
      } else {
        this.getLocation();
      }
      return;
    }

    this.setState({geofenceModal: false, loading: false});
    Alert.alert('Current Location', 'To use your current location, go into your phone settings and enable location access for Our Voice.', [{text: 'OK'}], { cancelable: false });
  }

  onChange(value) {
    if (value.type == 'List') value = t.String; // do something...
  }

  onChangeName(info) {
    this.setState({info});
  }

  doAddCustom() {
    let { fields, order } = this.state;

    let ref = this.refs.customForm.getValue();
    if (ref === null) return;
    let json = JSON.parse(JSON.stringify(ref)); // deep copy

    let key = json.key;
    delete json.key;
    json.optional = true; // backwards compatability

    // check for duplicate keys
    if (fields[key])
      return Alert.alert('Error', 'Duplicate Input Key. Change your Input Key to add this item.', [{text: 'OK'}], { cancelable: false });

    fields[key] = json;
    order[order.length] = key;

    this.setState({customForm: null, fields: fields, order: order});

  }

  doSave = async () => {
    let { fields, order, edit, form, refer, user, dbx } = this.state;

    this.setState({saving: true});
    let msg = null;

    let json = this.refs.mainForm.getValue();
    if (edit === false && json === null) msg = 'Please name this form.';
    else {

      let formName;

      if (edit === false) {
        // get rid of ending whitespace
        formName = json.name.trim();

        // disallow anything other than alphanumeric and a few other chars
        if (!formName.match(/^[a-zA-Z0-9\-_ ]+$/)) msg = 'From name can only contain alphanumeric characters, and spaces and dashes.';

        // max length
        if (formName.length > 255) msg = 'Form name cannot be longer than 255 characters.';
      } else {
        formName = form.name;
      }

      let forms = [];

      // make sure this name doesn't exist as a dropbox folder
      try {

        let epoch = Math.floor(new Date().getTime() / 1000);
        let id = sha1(epoch+":"+formName);

        let obj;

        obj = {
          id: id,
          created: epoch,
          updated: epoch,
          name: formName,
          author: (user.dropbox ? user.dropbox.name.display_name : 'You'),
          author_id: ( user.dropbox ? user.dropbox.account_id : id ),
          version: 1,
          questions: fields,
          questions_order: order,
        };

        if (edit === true) {
          obj.id = form.id;
          obj.created = form.created;
          obj.name = form.name;
          obj.geofence = form.geofence;
        }

        if (edit === false && dbx) {
          let res = await dbx.filesListFolder({path: ''});
          for (let i in res.entries) {
            item = res.entries[i];
            if (item['.tag'] != 'folder') continue;
            let name = item.path_display.substr(1).toLowerCase();
            if (name == obj.name.toLowerCase())
              msg = 'Dropbox folder name '+name+' already exists. Please choose a different name.';
          }
        }

        try {
          let forms;

          const value = await storage.get('OV_CANVASS_FORMS');
          if (value !== null)
            forms = JSON.parse(value);

          if (!forms) forms = [];

          for (let idx in forms) {
            if (forms[idx] === null || forms[idx].id === obj.id) delete forms[idx];
            if (forms[idx] && forms[idx].name.toLowerCase() === obj.name.toLowerCase())
              msg = 'A form named ""'+obj.name+'"" already exists. Please choose a different name.';
          }

          if (msg === null) {
            forms.push(obj);
            await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms));
          }
        } catch (e) {
          console.warn(""+e);
          msg = "Unable to save form data.";
        }

        if (dbx && msg === null) {
          if (!obj.folder_path) obj.folder_path = '/'+obj.name;
          let canvassingform = encoding.convert(tr(JSON.stringify(obj)), 'ISO-8859-1');
          await dbx.filesUpload({ path: obj.folder_path+'/canvassingform.json', contents: canvassingform, mute: true, mode: {'.tag': 'overwrite'} });
          // copy the updated form to all sub-folders
          if (edit === true) {
            let res = await dbx.filesListFolder({path: obj.folder_path});
            for (let i in res.entries) {
              let item = res.entries[i];
              if (item['.tag'] === 'folder' && item.path_display.match(/@/)) {
                try {
                  await dbx.filesUpload({ path: item.path_display+'/canvassingform.json', contents: canvassingform, mute: true, mode: {'.tag': 'overwrite'} });
                } catch (e) {
                  console.warn(e);
                }
              }
            }
          }
        }

      } catch (error) {
        msg = 'Unable to save form, an unknown error occurred.';
      }
    }

    if (msg === null) {
      refer._loadDBData();
      this.props.navigation.goBack();
    } else {
      Alert.alert('Error', msg, [{text: 'OK'}], { cancelable: false });
    }

    this.setState({saving: false});
  }

  doShowCustom() {
    this.setState({customForm: t.struct(addItem)});
  }

  inputTypeToReadable(type) {
    switch (type) {
      case 'String': return 'Text Input';
      case 'TEXTBOX': return 'Text Box';
      case 'Number': return 'Number';
      case 'Boolean': return 'On/Off Switch';
      case 'SAND': return 'Agree/Disagree';
      case 'List': return 'Select from List';
    }
    return type;
  }

  rmField(obj) {
    let { fields, order } = this.state;
    for (let f in fields) {
      if (fields[f] === obj) {
        delete fields[f];
        order.splice(order.indexOf(f), 1);
      }
    }
    this.setState({fields, order});
    this.forceUpdate();
  }

  render() {

    let { name, form, customForm, fields, order, saving } = this.state;
    let items = [];
    let defaultList = [];

    // blank while saving
    if (saving) return (
        <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20}}>Saving form...</Text>
          <ActivityIndicator />
        </View>
      );

    return (
      <View style={{flex: 1, backgroundColor: 'white'}}>

        <Form
          ref="mainForm"
          type={this.mainForm}
          onChange={this.onChangeName}
          value={this.state.info}
        />

        <View style={{flexDirection: 'row', marginLeft: 20, alignItems: 'center'}}>
          <Text>Limit canvassing to a specific area:</Text>
          <View style={{margin: 12}}>
            <Icon.Button
              name="unlock"
              backgroundColor="#d7d7d7"
              color="black"
              onPress={() => this.showGeofenceModal()}>
              Tap to set
            </Icon.Button>
          </View>
        </View>

        <View style={{flexDirection: 'row', marginLeft: 20, alignItems: 'center'}}>
          <Text>Items in your Canvassing form:</Text>
          <View style={{margin: 12}}>
            <Icon.Button
              name="plus-circle"
              backgroundColor="#d7d7d7"
              color="black"
              onPress={this.doShowCustom}>
              Add Item
            </Icon.Button>
          </View>
        </View>

        <SortableListView
          style={{ flex: 1, margin: 5, marginTop: 0 }}
          data={fields}
          order={order}
          onRowMoved={e => {
            let { order } = this.state;
            order.splice(e.to, 0, order.splice(e.from, 1)[0]);
            this.setState(order);
          }}
          renderRow={row => {
            return (
              <TouchableHighlight
                underlayColor={'#eee'}
                style={{
                  padding: 5,
                  backgroundColor: '#F8F8F8',
                  borderBottomWidth: 1,
                  borderColor: '#eee',
                }}
                {...this.props.sortHandlers}
                >
                <View>
                  <View style={{flexDirection: 'row'}}>
                    <View style={{width: (Dimensions.get('window').width*.62)-5}}>
                      <Text style={{margin: 5}}>
                        {row.label+(row.required?' *':'')}
                      </Text>
                    </View>
                    <View style={{width: (Dimensions.get('window').width*.32)-5}}>
                      <Text style={{margin: 5}}>
                        : {this.inputTypeToReadable(row.type)}
                      </Text>
                    </View>
                    <View style={{width: Dimensions.get('window').width*.05, justifyContent: 'center'}}>
                      <Icon
                        name="times-circle"
                        backgroundColor="#d7d7d7"
                        color="#ff0000"
                        size={20}
                        onPress={() => {
                          Alert.alert(
                            'Delete Item',
                            'Are you sure you wish to delete the item "'+row.label+'"?',
                            [
                              {text: 'OK', onPress: () => this.rmField(row)},
                              {text: 'Cancel'}
                            ],
                            { cancelable: false }
                          );
                        }}>
                      </Icon>
                    </View>
                  </View>
                </View>
              </TouchableHighlight>
            );
          }}
        />

        <TouchableHighlight style={styles.button} onPress={this.doSave} underlayColor='#99d9f4'>
          <Text style={styles.buttonText}>Save Form</Text>
        </TouchableHighlight>

        <Modal
          open={(customForm !== null)}
          modalStyle={{width: 350, height: 450, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({customForm: null})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <View style={styles.container}>
            <Form
              ref="customForm"
              type={customForm}
              options={options}
              onChange={this.onChange}
            />
            <TouchableHighlight style={styles.button} onPress={this.doAddCustom} underlayColor='#99d9f4'>
              <Text style={styles.buttonText}>Add this item</Text>
            </TouchableHighlight>
            <TouchableHighlight style={styles.button} onPress={() => this.setState({customForm: null})} underlayColor='#99d9f4'>
              <Text style={styles.buttonText}>Dismiss</Text>
            </TouchableHighlight>
          </View>
        </Modal>

        <Modal
          open={this.state.geofenceModal}
          modalStyle={{width: 350, height: 450, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({geofenceModal: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <View style={styles.container}>
            {this.state.loading &&
            <View style={{flexDirection: 'row'}}>
              <ActivityIndicator />
              <Text style={{fontStyle: 'italic'}}> loading distrcit information</Text>
            </View>
            ||
            <View>
              <Text>Choose area to limit canvassing to:</Text>

              <TouchableOpacity
                style={{
                  backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20,
                  height: 100, maxWidth: 275, justifyContent: 'center', margin: 10,
                }}
                onPress={() => this.setState({geofence: this.state.stategeo})}>
                <Text style={{textAlign: 'center'}}>State of {this.state.state}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20,
                  height: 100, maxWidth: 275, justifyContent: 'center', margin: 10,
                }}
                onPress={() => this.setState({geofence: this.state.cdgeo})}>
                <Text style={{textAlign: 'center'}}>Congressional Distrcit {this.state.state}-{this.state.cd}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20,
                  height: 100, maxWidth: 275, justifyContent: 'center', margin: 10,
                }}
                onPress={() => this.setState({geofenceModal: false})}>
                <Text style={{textAlign: 'center'}}>None</Text>
              </TouchableOpacity>

            </View>
            }
          </View>
        </Modal>

      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  buttonText: {
    fontSize: 18,
    color: 'white',
    alignSelf: 'center'
  },
  button: {
    height: 36,
    backgroundColor: '#48BBEC',
    borderColor: '#48BBEC',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'stretch',
    justifyContent: 'center'
  }
});
