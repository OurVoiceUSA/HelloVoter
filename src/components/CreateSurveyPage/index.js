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
      customForm: null,
      fields: [],
    };

    this.onChange = this.onChange.bind(this);
    this.doAddCustom = this.doAddCustom.bind(this);
    this.doSave = this.doSave.bind(this);
    this.doShowCustom = this.doShowCustom.bind(this);
  }

  onChange(value) {
    const { typeList } = this.state;

    if (value.type == 'List') value = t.String; // do something...
  }

  doAddCustom() {
    let { fields } = this.state;

    let json = this.refs.customForm.getValue();
    if (json == null) return;

    fields.push(json);

    this.setState({customForm: null, fields: fields});

  }

  doSave() {
    let { form, customForm } = this.state;

    //this.props.navigation.goBack();

  }

  doShowCustom() {
    this.setState({customForm: t.struct(addItem)});
  }

  render() {

    let { name, form, customForm, fields } = this.state;
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

        {customForm &&
        <View style={styles.container}>
          <Form
            ref="customForm"
            type={customForm}
            options={options}
            onChange={this.onChange}
          />
          <TouchableHighlight style={styles.button} onPress={this.doAddCustom} underlayColor='#99d9f4'>
            <Text style={styles.buttonText}>Add this item</Text>
          </TouchableHighlight>
          <TouchableHighlight style={styles.button} onPress={() => this.setState({customForm: null})} underlayColor='#99d9f4'>
            <Text style={styles.buttonText}>Undo</Text>
          </TouchableHighlight>
        </View>
        ||
        <View style={styles.container}>
          <TouchableHighlight style={styles.button} onPress={this.doShowCustom} underlayColor='#99d9f4'>
            <Text style={styles.buttonText}>Add custom field</Text>
          </TouchableHighlight>
        </View>
        }

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

