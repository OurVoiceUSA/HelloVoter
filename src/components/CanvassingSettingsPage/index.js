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

var mainForm = t.struct({
  'show_only_my_turf': t.Boolean,
  'movable_pins': t.Boolean,
});

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
           onChange={this.onChange}
           value={this.state.refer.state.canvassSettings}
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
