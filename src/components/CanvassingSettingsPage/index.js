import React, { PureComponent } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableHighlight,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
  Text,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import DropboxSharePage from '../DropboxSharePage';
import DeviceInfo from 'react-native-device-info';
import Modal from 'react-native-simple-modal';
import t from 'tcomb-form-native';

var Form = t.form.Form;

var options = {
  fields: {
    draggable_pins: {
      label: 'Pins can be moved',
      help: 'Your device\'s GPS may drop pins with low accuracy. Enabling this allows you to drag-and-drop pins.',
    },
    show_only_my_turf: {
      label: 'Show only my turf',
      help: 'If you don\'t want to see the progress of others with this form, enable this option.',
    },
    sync_on_cellular: {
      label: 'Sync over cellular',
      help: 'Allow syncing of data over your cellular connection. Data rates may apply.',
    },
    auto_sync: {
      label: 'Automatially sync data',
      help: 'If you are on wifi, or enabled syncing on cellular, data will sync automatically as you canvass.',
    },
    share_progress: {
      label: 'Share progress',
      help: 'If enabled, syncing your device will allow all your canvassers to see each other\'s progress on thier devices after they sync too.',
    },
    only_export_home: {
      label: 'Only export taken surveys',
      help: 'When you export your data, this makes it so \'not home\' and \'not interested\' don\'t show up in the spreadsheet.',
    },
  },
};

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
      exportRunning: false,
      DropboxShareScreen: false,
    };

    this.onChange = this.onChange.bind(this);
  }

  onChange(canvassSettings) {
    const { refer } = this.state;

    if (refer.state.canvassSettings.share_progress !== true && canvassSettings.share_progress === true) {
      Alert.alert(
        'Data Sharing',
        '"Share progress" enables anyone who you shared your canvassing form with to see everyone\'s progress. Local laws in your area may govern with whom you may share name and address information with. It is your responsibility to make sure you are in compliance with the law. Are you sure you wish to enable this option?',
        [
          {text: 'Yes', onPress: () => {
            refer._setCanvassSettings(canvassSettings);
            setTimeout(() => this.forceUpdate(), 500);
          }},
          {text: 'No', onPress: () => this.forceUpdate()}
        ], { cancelable: false });
    } else {
      refer._setCanvassSettings(canvassSettings);
    }

    setTimeout(() => this.forceUpdate(), 500);
  }

  exportDone(success) {
    if (success)
      Alert.alert('Success', 'Data export successful! Check your dropbox account for the spreadsheet.', [{text: 'OK'}], { cancelable: false });
    else
      Alert.alert('Error', 'Unable to export data to the server.', [{text: 'OK'}], { cancelable: false });
  }

  render() {
    const { refer } = this.state;

    let formOpt = {
      'show_only_my_turf': t.Boolean,
      'draggable_pins': t.Boolean,
      'sync_on_cellular': t.Boolean,
      'auto_sync': t.Boolean,
    };

    // additional settings for the form owner
    if (refer.state.user.dropbox.account_id === refer.state.form.author_id) {
      formOpt['share_progress'] = t.Boolean;
      formOpt['only_export_home'] = t.Boolean;
    }

    let mainForm = t.struct(formOpt);

    return (
      <ScrollView style={{flex: 1, padding: 15, backgroundColor: 'white'}}>

        <View style={{flex: 1, alignItems: 'flex-end'}}>
          <Text>Your device ID is:</Text>
          <Text>{DeviceInfo.getUniqueID()}</Text>
        </View>

        {refer.state.user.dropbox.account_id == refer.state.form.author_id &&
        <View>

          <View style={{
              width: Dimensions.get('window').width,
              height: 1,
              backgroundColor: 'lightgray',
              margin: 10,
            }}
          />

          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 20, marginBottom: 10}}
              onPress={() => this.setState({DropboxShareScreen: true})}>
              <Icon name="share-square" size={50} color="#808080" />
              <Text style={{fontSize: 20, marginLeft: 10}}>Share form</Text>
            </TouchableOpacity>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {this.state.exportRunning &&
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <ActivityIndicator size="large" />
              <Text style={{fontSize: 20, marginLeft: 10}}>Exporting data...</Text>
            </View>
            ||
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 20, marginBottom: 10}}
              onPress={() => {
              if (refer.state.netInfo === 'none') {
                Alert.alert('Export failed.', 'You are not connected to the internet.', [{text: 'OK'}], { cancelable: false });
              } else if (!refer.syncingOk()) {
                Alert.alert('Export failed.', 'You are not connected to wifi. To sync over your cellular connection, enable \'Sync over cellular\' in settings.', [{text: 'OK'}], { cancelable: false });
              } else if (refer.state.syncRunning) {
                Alert.alert('Export failed.', 'Data sync is currently running. Wait until it\'s finished and try again.', [{text: 'OK'}], { cancelable: false });
              } else {
                refer.doExport(this);
              }
            }}>
              <Icon name="save" size={50} color={(refer.syncingOk() ? "#b20000" : "#d3d3d3")} />
              <Text style={{fontSize: 20, marginLeft: 10}}>Export data to spreadsheet</Text>
            </TouchableOpacity>
            }
          </View>
        </View>
        }

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray',
            margin: 10,
          }}
        />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Form
           ref="mainForm"
           type={mainForm}
           options={options}
           onChange={this.onChange}
           value={refer.state.canvassSettings}
          />
        </TouchableWithoutFeedback>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray',
            margin: 10,
          }}
        />

        <Modal
          open={this.state.DropboxShareScreen}
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
          <DropboxSharePage refer={this} funcs={refer} />
        </Modal>

      </ScrollView>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 30,
    alignSelf: 'center',
    marginBottom: 30
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
