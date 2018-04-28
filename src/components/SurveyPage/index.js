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

    this.state = {
      refer: state.params.refer,
      funcs: state.params.funcs,
      form: state.params.refer.state.form,
    };

    this.doSave = this.doSave.bind(this);
  }

  doSave = async () => {
    let { refer, funcs, form } = this.state;
    let json = this.refs.form.getValue();
    if (json == null) return;

    let epoch = Math.floor(new Date().getTime() / 1000);

    funcs._addNode({
      type: "survey",
      id: sha1(epoch+JSON.stringify(json)+refer.state.objectId),
      parent_id: refer.state.objectId,
      status: 'home',
      survey: json,
    });

    refer.forceUpdate();
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
    let newOptions = { fields: {} };

    let keys = Object.keys(form.questions);
    for (let k in keys) {
      let value;
      switch (form.questions[keys[k]].type) {
        case 'Number': value = t.Number; break;
        case 'Boolean': value = t.Boolean; break;
        case 'List': value = this.valueToEnums(form.questions[keys[k]].options); break;
        case 'SAND': value = SAND; break;
        default: value = t.String;
      }
      if (form.questions[keys[k]].optional) value = t.maybe(value);
      newStruct[keys[k]] = value;
      newOptions.fields[keys[k]] = { label: form.questions[keys[k]].label + (form.questions[keys[k]].optional ? '' : ' *') };
    }

    CanvassForm = t.struct(newStruct);
    options = newOptions;

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}}>

        <View style={styles.container}>

          <View style={{flex: 1, marginBottom: 10, alignItems: 'center'}}>
            <Text style={{fontSize: 20}}>{form.name}</Text>
            <Text>Form created by {form.author}</Text>
          </View>

          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Form
              ref="form"
              type={CanvassForm}
              options={options}
            />
          </TouchableWithoutFeedback>
        </View>

        <TouchableHighlight style={styles.button} onPress={this.doSave} underlayColor='#99d9f4'>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableHighlight>

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
