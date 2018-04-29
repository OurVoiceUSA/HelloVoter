import React, { PureComponent } from 'react';
import {
  TouchableHighlight,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

import DeviceInfo from 'react-native-device-info';
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
    share_progress: {
      label: 'Share progress',
      help: 'When you export your form data, enabling this option will allow all your canvassers to see each other\'s progress on thier devices.',
    },
  },
};

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
    };

    this.onChange = this.onChange.bind(this);
  }

  onChange(canvassSettings) {
    this.state.refer._setCanvassSettings(canvassSettings);
  }

  render() {
    const { refer } = this.state;

    let formOpt = {
      'show_only_my_turf': t.Boolean,
      'draggable_pins': t.Boolean,
    };

    // additional settings for the form owner
    if (refer.state.user.dropbox.account_id === refer.state.form.author_id) {
      formOpt['share_progress'] = t.Boolean;
    }

    let mainForm = t.struct(formOpt);

    return (
      <ScrollView style={{flex: 1, padding: 15, backgroundColor: 'white'}}>

        <View style={{flex: 1, alignItems: 'flex-end'}}>
          <Text>Your device ID is:</Text>
          <Text>{DeviceInfo.getUniqueID()}</Text>
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Form
           ref="mainForm"
           type={mainForm}
           options={options}
           onChange={this.onChange}
           value={refer.state.canvassSettings}
          />
        </TouchableWithoutFeedback>

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
