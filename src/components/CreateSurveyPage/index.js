
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
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
import storage from 'react-native-storage-wrapper';
import SortableListView from 'react-native-sortable-listview'
import Icon from 'react-native-vector-icons/FontAwesome';
import sha1 from 'sha1';
import encoding from 'encoding';
import { transliterate as tr } from 'transliteration/src/main/browser';
import { Dropbox } from 'dropbox';

var Form = t.form.Form;

var mainForm = t.struct({
  'name': t.String,
});

const FTYPE = t.enums({
  'String': 'Text Input',
  'TEXTBOX': 'Large Text Box',
  'Number': 'Number',
  'Boolean': 'On/Off Switch',
  'SAND': 'Agree/Disagree',
//  'List': 'Select from List',
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

var premade = {
  'FullName': { label: 'Full Name', type: 'String', optional: true },
  'Email': { label: 'Email Address', type: 'String', optional: true },
  'RegisteredToVote': { label: 'Are you registered to vote?', type: 'Boolean', optional: true },
  'PartyAffiliation': { label: 'Party Affiliation', type: 'List', optional: true,
    options: [
      'No Party Preference',
      'Democrat',
      'Republican',
      'Green',
      'Libertarian',
      'Other',
    ]},
};

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    const { state } = this.props.navigation;

    let fields = JSON.parse(JSON.stringify(premade)); // deep copy

    this.state = {
      refer: props.navigation.state.params.refer,
      user: props.navigation.state.params.refer.state.user,
      dbx: props.navigation.state.params.refer.state.dbx,
      name: null,
      customForm: null,
      fields: fields,
      order: Object.keys(fields),
      saving: false,
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
    let { fields, order } = this.state;

    let ref = this.refs.customForm.getValue();
    if (ref === null) return;
    let json = JSON.parse(JSON.stringify(ref)); // deep copy

    let key = json.key;
    delete json.key;
    json.optional = true; // backwards compatability

    // check for duplicate keys
    if (fields[key])
      return Alert.alert('Error', 'Duplicate Input Key. Change your Input Key to add this item.', [{text: 'OK'}], { cancelable: false });

    fields[key] = json;
    order = Object.keys(fields);

    this.setState({customForm: null, fields: fields, order: order});

  }

  doSave = async () => {
    let { fields, refer, user, dbx } = this.state;

    let msg = null;

    let json = this.refs.mainForm.getValue();
    if (json == null) msg = 'Please name this form.';
    else {
      // get rid of ending whitespace
      let formName = json.name.trim();

      // disallow anything other than alphanumeric and a few other chars
      if (!formName.match(/^[a-zA-Z0-9\-_ ]+$/)) msg = 'From name can only contain alphanumeric characters, and spaces and dashes.';

      // max length
      if (formName.length > 255) msg = 'Form name cannot be longer than 255 characters.';

      this.setState({saving: true});

      let forms = [];

      // make sure this name doesn't exist as a dropbox folder
      try {

        if (dbx) {
          let res = await dbx.filesListFolder({path: ''});
          for (let i in res.entries) {
            item = res.entries[i];
            if (item['.tag'] != 'folder') continue;
            let name = item.path_display.substr(1).toLowerCase();
            if (name == formName.toLowerCase())
              msg = 'Dropbox folder name '+name+' already exists. Please choose a different name.';
          }
        }

        let epoch = Math.floor(new Date().getTime() / 1000);
        let id = sha1(epoch+":"+formName);

        let obj = {
          id: id,
          created: epoch,
          name: formName,
          author: (user.dropbox ? user.dropbox.name.display_name : 'You'),
          author_id: ( user.dropbox ? user.dropbox.account_id : id ),
          version: 1,
          questions: fields,
          question_order: order,
        };

        try {
          let forms;

          const value = await storage.get('OV_CANVASS_FORMS');
          if (value !== null)
            forms = JSON.parse(value);

          if (!forms) forms = [];

          forms.push(obj);

          await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms));
        } catch (e) {
          console.warn(""+e);
          msg = "Unable to save form data.";
        }

        if (dbx && msg === null) {
          await dbx.filesCreateFolderV2({path: '/'+formName, autorename: false});
          await dbx.filesUpload({ path: '/'+formName+'/canvassingform.json', contents: encoding.convert(tr(JSON.stringify(obj)), 'ISO-8859-1'), mute: true, mode: {'.tag': 'overwrite'} });
        }

      } catch (error) {
        msg = 'Unable to save form, an unknown error occurred.';
      }
    }

    if (msg === null) {
      refer._loadDBData();
      this.props.navigation.goBack();
    } else {
      Alert.alert('Error', msg, [{text: 'OK'}], { cancelable: false });
    }

    this.setState({saving: false});
  }

  doShowCustom() {
    this.setState({customForm: t.struct(addItem)});
  }

  inputTypeToReadable(type) {
    switch (type) {
      case 'String': return 'Text Input';
      case 'TEXTBOX': return 'Text Box';
      case 'Number': return 'Number';
      case 'Boolean': return 'On/Off Switch';
      case 'SAND': return 'Agree/Disagree';
      case 'List': return 'Select from List';
    }
    return type;
  }

  rmField(obj) {
    let { fields, order } = this.state;
    for (let f in fields) {
      if (fields[f] === obj) delete fields[f];
    }
    order = Object.keys(fields);
    this.setState({fields, order});
  }

  render() {

    let { name, form, customForm, fields, order, saving } = this.state;
    let items = [];
    let defaultList = [];

    // blank while saving
    if (saving) return (
        <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20}}>Saving form...</Text>
          <ActivityIndicator />
        </View>
      );

    return (
      <View style={{flex: 1, backgroundColor: 'white'}}>

        <View style={{flexDirection: 'row', margin: 20, alignItems: 'center'}}>
          <Text>Your Canvassing form will have these items:</Text>
        </View>

        <SortableListView
          style={{ flex: 1, margin: 5, marginTop: 0 }}
          data={fields}
          order={order}
          onRowMoved={e => {
            let { order } = this.state;
            order.splice(e.to, 0, order.splice(e.from, 1)[0]);
            this.setState(order);
          }}
          renderRow={row => {
            return (
              <TouchableHighlight
                underlayColor={'#eee'}
                style={{
                  padding: 5,
                  backgroundColor: '#F8F8F8',
                  borderBottomWidth: 1,
                  borderColor: '#eee',
                }}
                {...this.props.sortHandlers}
                >
                <View>
                  <View style={{flexDirection: 'row'}}>
                    <View style={{width: (Dimensions.get('window').width*.6)-5}}>
                      <Text style={{margin: 5}}>
                        {row.label+(row.required?' *':'')}
                      </Text>
                    </View>
                    <View style={{width: (Dimensions.get('window').width*.35)-5}}>
                      <Text style={{margin: 5}}>
                        : {this.inputTypeToReadable(row.type)}
                      </Text>
                    </View>
                    <View style={{width: Dimensions.get('window').width*.05, justifyContent: 'center'}}>
                      <Icon
                        name="times-circle"
                        backgroundColor="#d7d7d7"
                        color="#ff0000"
                        size={20}
                        onPress={() => {
                          Alert.alert(
                            'Delete Item',
                            'Are you sure you wish to delete the item "'+row.label+'"?',
                            [
                              {text: 'OK', onPress: () => this.rmField(row)},
                              {text: 'Cancel'}
                            ],
                            { cancelable: false }
                          );
                        }}>
                      </Icon>
                    </View>
                  </View>
                </View>
              </TouchableHighlight>
            );
          }}
        />

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

        <Form
          ref="mainForm"
          type={mainForm}
        />

        <TouchableHighlight style={styles.button} onPress={this.doSave} underlayColor='#99d9f4'>
          <Text style={styles.buttonText}>Save Form</Text>
        </TouchableHighlight>

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
