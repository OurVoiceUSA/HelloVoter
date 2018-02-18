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
  'String': 'Text Field',
  'Number': 'Number',
  'Boolean': 'Switch',
  'List': 'List',
}, 'FTYPE');

var addItem = {
  inputKey: t.String,
  inputLabel: t.String,
  type: FTYPE,
  required: t.Boolean
};

var options = {};

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    const { state } = this.props.navigation;

    this.state = {
      form: t.struct(addItem),
      fields: [],
    };

    this.doAdd = this.doAdd.bind(this);
    this.doSave = this.doSave.bind(this);
  }

  doAdd = async () => {
    let { fields } = this.state;

    let json = this.refs.form.getValue();
    if (json == null) return;

    fields.push(json);

    this.setState({form: t.struct(addItem), fields: fields});

  }

  doSave = async () => {
    let { form } = this.state;

    //this.props.navigation.goBack();

  }

  render() {

    let { form, fields } = this.state;
    let items = [];

    for (let i in fields) items.push(
        <Text key={i}>
          {fields[i].inputLabel+(fields[i].required?'':' (optional)')} : {fields[i].type}
        </Text>
      )

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}}>

        <View style={styles.container}>
        <Form
          ref="form"
          type={form}
          options={options}
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

