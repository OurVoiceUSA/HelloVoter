import React, { PureComponent } from 'react';
import {
  Alert,
  Dimensions,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  FlatList,
  Keyboard,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { Container, Header, Content, Footer, FooterTab, Text, Button } from 'native-base';

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
      info: state.params.info,
      form: state.params.refer.state.form,
    };

    this.doSave = this.doSave.bind(this);
    this.onChange = this.onChange.bind(this);

    this.edits = false;
    this.goBack = this.props.navigation.goBack;
    this.props.navigation.goBack = () => {
      if (this.edits) {
        Alert.alert(
          'Unsaved Form',
          'You have unsaved edits. Do you want to save your changes?',
          [
            {text: 'Discard Changes', onPress: () => { this.goBack();
            }},
            {text: 'Keep Editing'},
          ], { cancelable: false }
        );
      } else {
        this.goBack();
      }
    };
  }

  onChange(value) {
    this.edits = true;
  }

  doSave = async () => {
    let { refer, funcs, form } = this.state;
    let json = this.refs.form.getValue();
    if (json == null) return;

    let epoch = funcs.getEpoch();

    funcs._addNode({
      type: "survey",
      id: sha1(epoch+JSON.stringify(json)+refer.state.currentNode.id),
      parent_id: refer.state.currentNode.id,
      status: 'home',
      survey: json,
    });

    funcs.updateMarkers();
    refer.forceUpdate();
    this.goBack();
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

    let keys;

    if (form.questions_order) keys = form.questions_order;
    else keys = Object.keys(form.questions);
    for (let k in keys) {
      let value;
      let boxflag = false;
      switch (form.questions[keys[k]].type) {
        case 'TEXTBOX': value = t.String; boxflag = true; break;
        case 'Number': value = t.Number; break;
        case 'Boolean': value = t.Boolean; break;
        case 'List': value = this.valueToEnums(form.questions[keys[k]].options); break;
        case 'SAND': value = SAND; break;
        default: value = t.String;
      }
      if (form.questions[keys[k]].optional) value = t.maybe(value);
      newStruct[keys[k]] = value;
      newOptions.fields[keys[k]] = { label: form.questions[keys[k]].label + (form.questions[keys[k]].optional ? '' : ' *') };
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
    <View style={{flex: 1}}>
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
              value={this.state.info}
              onChange={this.onChange}
            />
          </TouchableWithoutFeedback>
        </View>

      </ScrollView>

      <BottomNavigation active={'done'} hidden={false} >
        <BottomNavigation.Action
          key="undo"
          icon="undo"
          label="Go Back"
          onPress={() => this.props.navigation.goBack()}
        />
        <BottomNavigation.Action
          key="done"
          icon="done"
          label="Save Changes"
          onPress={this.doSave}
        />
      </BottomNavigation>
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
