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
import DeviceInfo from 'react-native-device-info';
import Modal from 'react-native-simple-modal';
import t from 'tcomb-form-native';

var Form = t.form.Form;

var options = {
  fields: {
    filter_pins: {
      label: 'Filter Results by attribute value',
      help: 'To help you further target your canvassing, enabling this will make the map only show addresses with people who match your below selected criteria.',
    },
  },
};

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      form: props.form,
    };

    // ensure the filter_key exists
    if (this.state.form.attributes.map((a) => a.id).indexOf(this.state.refer.state.canvassSettings.filter_key) === -1) {
      this.state.refer.state.canvassSettings = {};
    }

    this.onChange = this.onChange.bind(this);
  }

  onChange(canvassSettings) {
    const { refer } = this.state;
    // if the key changes, remove the filter_val to prevent tcomb from crashing
    if (canvassSettings.filter_key !== refer.state.canvassSettings.filter_key) delete canvassSettings.filter_val;
    refer.setState({canvassSettings});
    this.forceUpdate();
  }

  valueToEnums(options) {
    let obj = {};
    for (let i in options)
      obj[options[i].id] = options[i].label;
    return t.enums(obj);
  }

  attrToValues(attr) {
    let ret = {};
    if (attr.values) {
      attr.values.forEach((a) => ret[a] = a);
    } else {
      ret = {"TRUE": "TRUE", "FALSE": "FALSE"};
    }
    return t.enums(ret);
  }

  render() {
    const { form, refer, selectedAttribute } = this.state;

    let formOpt = {
      'filter_pins': t.Boolean,
    };

    let attrs = [];

    // selectable filter options are booleans and arrays
    form.attributes.forEach(a => {
      let value;
      if (!a.label) a.label = a.name;
      switch (a.type) {
        case 'boolean': attrs.push(a); break;
        case 'string': if (a.values) attrs.push(a); break;
        default: break;
      }
      if (refer.state.canvassSettings.filter_key === a.id) this.setState({selectedAttribute: a});
    });

    if (refer.state.canvassSettings.filter_pins) {
      if (attrs.length) {
        formOpt.filter_key = this.valueToEnums(attrs);

        if (selectedAttribute) {
          formOpt.filter_val = this.attrToValues(selectedAttribute);
        }
      }
    }

    let mainForm = t.struct(formOpt);

    return (
      <View style={{flex: 1, padding: 15, backgroundColor: 'white'}}>

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
