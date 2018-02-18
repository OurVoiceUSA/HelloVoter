import React, { PureComponent } from 'react';
import {
  Dimensions,
  TouchableOpacity,
  TouchableHighlight,
  FlatList,
  Text,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

import storage from 'react-native-storage-wrapper';
import t from 'tcomb-form-native';

var Form = t.form.Form;

var options = {};

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    const { state } = this.props.navigation;

    this.state = {
      form: t.struct({}),
    };

    this.doSave = this.doSave.bind(this);
  }

  doSave = async () => {
    let { form } = this.state;

    let json = this.refs.form.getValue();
    if (json == null) return;

    //this.props.navigation.goBack();

  }

  render() {

    let { viewOnly, form } = this.state;

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
      newOptions.fields[keys[k]] = { label: form.questions[keys[k]].label + (form.questions[keys[k]].optional ? ' (optional)' : '') };
    }

    options = newOptions;

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}}>

        <View style={styles.container}>
        <Form
          ref="form"
          type={form}
          options={options}
        />
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

