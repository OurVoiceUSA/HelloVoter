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

import {BackHandler} from 'react-native';
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
      refer: props.navigation.state.params.refer,
      form: props.navigation.state.params.form,
      canvassSettings: props.navigation.state.params.refer.state.canvassSettings,
    };

    this.onChange = this.onChange.bind(this);

    // make goBack() update the settings in the parent
    this.goBack = this.props.navigation.goBack;
    this.props.navigation.goBack = () => {
      this.state.refer._setCanvassSettings(this.state.canvassSettings);
      setTimeout(() => this.forceUpdate(), 500);
      this.goBack();
    };
  }

  componentDidMount() {
    BackHandler.addEventListener('hardwareBackPress', this.props.navigation.goBack);
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.props.navigation.goBack);
  }

  onChange(canvassSettings) {
    this.setState({canvassSettings});
  }

  valueToEnums(options) {
    let obj = {};
    for (let i in options)
      obj[options[i]] = options[i];
    return t.enums(obj);
  }

  attrOptsById(id) {
    let values = ["TRUE","FALSE"];
    let attr = {};
    this.state.form.attributes.forEach(a => {
      if (a.id === id) attr = a;
    });
    if (attr.type === 'string') values = attr.values;
    return values;
  }

  render() {
    const { refer, form, selectedFilterID } = this.state;

    let formOpt = {
      'filter_pins': t.Boolean,
    };

    let attrs = [];

    // selectable filter options are booleans, and (TODO:) arrays
    form.attributes.forEach(a => {
      let value;
      if (!a.label) a.label = a.name;
      switch (a.type) {
        case 'boolean': attrs.push(a); break;
// TODO: switching between boolean and string throws a fatal error, need to figure out why
//        case 'string': if (a.values) attrs.push(a); break;
        default: break;
      }
      if (this.state.canvassSettings.filter_key === a.label) this.setState({selectedFilterID: a.id}); 
    });

    if (this.state.canvassSettings.filter_pins) {
      if (attrs.length) {
        formOpt.filter_key = this.valueToEnums(attrs.map(a => a.label));

        if (selectedFilterID) {
          formOpt.filter_val = this.valueToEnums(this.attrOptsById(selectedFilterID));
        }
      }
    }

    let mainForm = t.struct(formOpt);

    return (
      <ScrollView style={{flex: 1, padding: 15, backgroundColor: 'white'}}>

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
           value={this.state.canvassSettings}
          />
        </TouchableWithoutFeedback>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray',
            margin: 10,
          }}
        />

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
