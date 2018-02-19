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

const FTYPE = t.enums({
  'String': 'Text Input',
  'Number': 'Number',
  'Boolean': 'On/Off Switch',
  'SAND': 'Agree/Disagree Scale',
//  'List': 'Select One of Many',
}, 'FTYPE');

var addItem = {
  key: t.String,
  label: t.String,
  type: FTYPE,
  required: t.Boolean
};

var options = {
  fields: {
    key: {
      label: 'Input Key',
      help: 'Column name in spreadsheet.',
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

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    const { state } = this.props.navigation;

    this.state = {
      name: null,
      form: t.struct(addItem),
      fields: [],
    };

    this.onChange = this.onChange.bind(this);
    this.doAdd = this.doAdd.bind(this);
    this.doSave = this.doSave.bind(this);
  }

  onChange(value) {
    const { typeList } = this.state;

    if (value.type == 'List') value = t.String; // do something...
  }

  doAdd() {
    let { fields } = this.state;

    let json = this.refs.form.getValue();
    if (json == null) return;

    fields.push(json);

    this.setState({form: t.struct(addItem), fields: fields});

  }

  doSave() {
    let { form } = this.state;

    //this.props.navigation.goBack();

  }

  render() {

    let { name, form, fields } = this.state;
    let items = [];

/*
    if (name == null) return (
      <View style={{flex: 1, justifyContent: 'flex-start', backgroundColor: 'white'}}>
        <View style={{margin: 20}}>
          <Text>Name your campaign:</Text>
        </View>
      </View>
      );
*/

    for (let i in fields) items.push(
        <Text key={i}>
          {fields[i].label+(fields[i].required?' *':'')} : {fields[i].type}
        </Text>
      )

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}}>

        <View style={styles.container}>
        <Form
          ref="form"
          type={form}
          options={options}
          onChange={this.onChange}
        />
        </View>

        <TouchableHighlight style={styles.button} onPress={this.doAdd} underlayColor='#99d9f4'>
          <Text style={styles.buttonText}>Add this item</Text>
        </TouchableHighlight>

        <View style={{margin: 20}}>
          { items }
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

