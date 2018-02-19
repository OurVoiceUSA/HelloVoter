
import React, { PureComponent } from 'react';

import {
  Alert,
  Dimensions,
  TouchableOpacity,
  TouchableHighlight,
  FlatList,
  Text,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

import t from 'tcomb-form-native';
import { Dropbox } from 'dropbox';

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

var premade = [
  { key: 'FullName', label: 'Full Name', type: 'String' },
  { key: 'Email', label: 'Email Address', type: 'String' },
  { key: 'RegisteredToVote', label: 'Are you registered to vote?', type: 'Boolean' },
  { key: 'PartyAffiliation', label: 'Party Affiliation', type: 'List',
    options: [
      'No Party Preference',
      'Democrat',
      'Republican',
      'Green',
      'Libertarian',
      'Other',
    ]},
  { key: 'VoteLastElection', label: 'Did you vote in the last election?', type: 'Boolean' },
];
var defaultFields = ['FullName', 'Email', 'RegisteredToVote', 'PartyAffiliation'];

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    const { state } = this.props.navigation;

    // initialize state with a subset of premade questions
    let fields = [];
    for (let i in defaultFields)
      for (let p in premade)
        if (premade[p].key == defaultFields[i]) fields.push(premade[p]);

    this.state = {
      refer: props.navigation.state.params.refer,
      user: props.navigation.state.params.refer.state.user,
      dbx: props.navigation.state.params.refer.state.dbx,
      name: null,
      customForm: null,
      fields: fields,
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

    // check for duplicate keys
    let keys = [json.key];
    for (let f in fields) {
      if (keys.indexOf(fields[f].key) !== -1)
        return Alert.alert('Error', 'Duplicate Input Key. Change your Input Key to add this item.', [{text: 'OK'}], { cancelable: false });
      keys.push(fields[f].key);
    }

    fields.push(json);

    this.setState({customForm: null, fields: fields});

  }

  doSave = async () => {
    let { fields, refer, dbx } = this.state;

    let forms = [];

    // make sure this name doesn't exist as a dropbox folder
    try {
      let res = await dbx.filesListFolder({path: ''});
      for (let i in res.entries) {
        item = res.entries[i];
        if (item['.tag'] != 'folder') continue;
        let name = item.path_display.substr(1).toLowerCase();
      }

      await refer._loadDBData();
      this.props.navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Unable to save form, an unknown error occurred.', [{text: 'OK'}], { cancelable: false });
    }

  }

  doShowCustom() {
    this.setState({customForm: t.struct(addItem)});
  }

  inputTypeToReadable(type) {
    switch (type) {
      case 'String': return 'Text Input';
      case 'Number': return 'Number';
      case 'Boolean': return 'On/Off Switch';
      case 'SAND': return 'Agree/Disagree Scale';
      case 'List': return 'Select One of Many';
    }
    return type;
  }

  render() {

    let { name, form, customForm, fields } = this.state;
    let items = [];
    let defaultList = [];

    // list premade questions that aren't in this state's fields
    for (let p in premade) {
      let found = false;
      for (let f in fields) {
        if (fields[f].key == premade[p].key) found = true;
      }
      if (!found) defaultList.push(premade[p]);
    }


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
        <View key={i}>
          <View style={{width: Dimensions.get('window').width, height: 1, backgroundColor: 'lightgray' }} />
          <Text style={{margin: 5}}>
            {fields[i].label+(fields[i].required?' *':'')} : {this.inputTypeToReadable(fields[i].type)}
          </Text>
        </View>
      )

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}}>

        <View style={{flex: 1, flexDirection: 'row', margin: 20, alignItems: 'center'}}>
          <Text>Your Canvassing form will have these items:</Text>
        </View>

        <View style={{margin: 20, marginTop: 0}}>
          { items }
        </View>

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

        <TouchableHighlight style={styles.button} onPress={this.doSave} underlayColor='#99d9f4'>
          <Text style={styles.buttonText}>Save Form</Text>
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

