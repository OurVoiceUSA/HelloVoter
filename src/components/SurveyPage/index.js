import React, { PureComponent } from 'react';
import {
  Dimensions,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  FlatList,
  Keyboard,
  Text,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { getEpoch } from '../../common';

import storage from 'react-native-storage-wrapper';
import t from 'tcomb-form-native';
import sha1 from 'sha1';

var Form = t.form.Form;

const SAND = t.enums({
  'SA': 'Strongly Agree',
  'A': 'Agree',
  'N': 'Neutral',
  'D': 'Disagree',
  'SD': 'Strongly Disagree',
}, 'SAND');

var CanvassForm = t.struct({});
var options = {};

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    const { state } = this.props.navigation;

    let values = {};

    for (let i in state.params.person.attrs) {
      values[state.params.person.attrs[i].id] = state.params.person.attrs[i].value;
    };

    this.state = {
      refer: state.params.refer,
      funcs: state.params.funcs,
      form: state.params.form,
      marker: state.params.marker,
      place: state.params.place,
      unit: state.params.unit,
      person: state.params.person,
      values: values,
      start: getEpoch(),
    };

    this.doSave = this.doSave.bind(this);
  }

  doSave = async () => {
    const { funcs, refer, marker, place, unit, person } = this.state;

    let json = this.refs.form.getValue();
    if (json == null) return;

    funcs.sendVisit(marker.address.id, place, unit, person, this.state.start, json);
    setTimeout(() => refer.forceUpdate(), 500);
    this.props.navigation.goBack();
  }

  valueToEnums(options) {
    let obj = {};
    for (let i in options)
      obj[options[i]] = options[i];
    return t.enums(obj);
  }

  render() {
    const { form } = this.state;

    let newStruct = {};
    let newOptions = {
      i18n: {
        optional: '',
        required: ' *',
      },
      fields: {},
    };

    let keys;

    keys = form.attributes_order;

    for (let k in keys) {
      let value;
      let mode;
      let boxflag = false;
      switch (form.attributes[keys[k]].type) {
        case 'textbox': value = t.String; boxflag = true; break;
        case 'number': value = t.Number; break;
        case 'boolean': value = t.Boolean; break;
        case 'sand': value = SAND; break;
        //case 'date': value = t.Date; mode = 'date'; break;
        case 'string':
          if (form.attributes[keys[k]].values) {
            let matching = this.state.person.attrs.filter(i => i.id === keys[k]);
            value = this.valueToEnums(form.attributes[keys[k]].values.concat(matching.map(i => i.value)));
          } else {
            value = t.String;
          }
          break;
        default: value = t.String;
      }
      if (!form.attributes[keys[k]].required) value = t.maybe(value);
      if (!form.attributes[keys[k]].label) form.attributes[keys[k]].label = form.attributes[keys[k]].name;
      newStruct[keys[k]] = value;
      newOptions.fields[keys[k]] = { label: form.attributes[keys[k]].label };
      if (mode) newOptions.fields[keys[k]].mode = mode;
      if (boxflag === true) {
        newOptions.fields[keys[k]].multiline = true;
        newOptions.fields[keys[k]].stylesheet = {
          ...Form.stylesheet,
          textbox: {
            ...Form.stylesheet.textbox,
            normal: {
              ...Form.stylesheet.textbox.normal,
              height: 150
            },
            error: {
              ...Form.stylesheet.textbox.error,
              height: 150
            }
          }
        };
      }
    }

    CanvassForm = t.struct(newStruct);
    options = newOptions;

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}}>

        <View style={styles.container}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Form
              ref="form"
              type={CanvassForm}
              options={options}
              value={this.state.values}
            />
          </TouchableWithoutFeedback>
        </View>

        <TouchableHighlight style={styles.button} onPress={this.doSave} underlayColor='#99d9f4'>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableHighlight>

        <View style={{width: Dimensions.get('window').width, height: 1, marginBottom: 250}} />

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
