import React from 'react';
import {
  BackHandler,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from 'react-native';

import { Container, Header, Content, Footer, FooterTab, Text, Button } from 'native-base';

import HVComponent, { HVConfirmDialog } from '../HVComponent';

import { say, getEpoch, getPropFromArrObj } from '../common';

import Icon from 'react-native-vector-icons/FontAwesome';
import storage from 'react-native-storage-wrapper';
import KeepAwake from 'react-native-keep-awake';
import t from 'tcomb-form-native';

var Form = t.form.Form;

var CanvassForm = t.struct({});
var options = {};

export default class App extends HVComponent {
  constructor(props) {
    super(props);

    const { state } = this.props.navigation;

    let values = {};

    for (let i in state.params.person.attrs) {
      if (state.params.person.attrs[i].value) {
        let type = getPropFromArrObj(state.params.form.attributes, state.params.person.attrs[i].id, 'type');
        if (type) {
          if (type === 'boolean') {
            if (state.params.person.attrs[i].value) values[state.params.person.attrs[i].id] = true;
            else values[state.params.person.attrs[i].id] = false;
          } else {
            values[state.params.person.attrs[i].id] = state.params.person.attrs[i].value;
          }
        }
      }
    };

    this.state = {
      refer: state.params.refer,
      funcs: state.params.funcs,
      form: state.params.form,
      marker: state.params.marker,
      unit: state.params.unit,
      person: state.params.person,
      values: values,
      start: getEpoch(),
    };

    this.onChange = this.onChange.bind(this);
    this.doSave = this.doSave.bind(this);

    this.edits = false;
    this.goBack = this.props.navigation.goBack;
    this.props.navigation.goBack = () => {
      if (this.edits) {
        this.alert(
          say("unsaved_form"),
          say("you_have_unsaved_edits"),
          {
            title: say("keep_editing"),
            onPress: () => this.setState({confirmDialog: false}),
          },
          {
            title: say("discard_changes"),
            onPress: () => {
              this.setState({confirmDialog: false});
              this.goBack();
            },
          }
        );
      } else {
        this.goBack();
      }
      return true;
    };

  }

  componentDidMount() {
    BackHandler.addEventListener('hardwareBackPress', this.props.navigation.goBack);
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.props.navigation.goBack);
  }

  onChange(values) {
    this.setState({values});
    this.edits = true;
  }

  doSave = async () => {
    const { funcs, refer, marker, unit, person } = this.state;

    const place = (unit?unit:marker);

    let json = this.refs.form.getValue();
    if (json == null) return;

    refer.setState({updated: getEpoch()});
    funcs.sendVisit(marker.address.id, place, unit, person, this.state.start, json);

    // update local
    person.visit = true;

    let ids = Object.keys(json);
    for (let i in ids) {
      let found = false;
      person.attrs.forEach(a => {
        if (a.id === ids[i]) {
          found = true;
          a.value = json[ids[i]];
        }
      });
      // wasn't there? add it
      if (!found) person.attrs.push({id: ids[i], value: json[ids[i]]});
    }

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
    let newOptions = {
      i18n: {
        optional: '',
        required: ' *',
      },
      fields: {},
    };

    form.attributes.forEach(a => {
      let value;
      let mode;
      let boxflag = false;
      switch (a.type) {
        case 'textbox': value = t.String; boxflag = true; break;
        case 'number': value = t.Number; break;
        case 'boolean': value = t.Boolean; break;
        //case 'date': value = t.Date; mode = 'date'; break;
        case 'string':
          if (a.values) {
            let matching = this.state.person.attrs.filter(i => i.id === a.id);
            value = this.valueToEnums(a.values.concat(matching.map(i => i.value)));
          } else {
            value = t.String;
          }
          break;
        default: value = t.String;
      }
      if (!a.required) value = t.maybe(value);
      if (!a.label) a.label = a.name;
      newStruct[a.id] = value;
      newOptions.fields[a.id] = { label: a.label };
      if (mode) newOptions.fields[a.id].mode = mode;
      if (a.readonly) {
        newOptions.fields[a.id].disabled = true;
        newOptions.fields[a.id].editable = false;
      }
      if (boxflag === true) {
        newOptions.fields[a.id].multiline = true;
        newOptions.fields[a.id].stylesheet = {
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
    });

    CanvassForm = t.struct(newStruct);
    options = newOptions;

    return (
      <Container>
        <Content padder>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Form
              ref="form"
              type={CanvassForm}
              options={options}
              value={this.state.values}
              onChange={this.onChange}
            />
          </TouchableWithoutFeedback>
        </Content>

        <HVConfirmDialog refer={this} />

        <Footer>
          <FooterTab>
            <Button onPress={() => this.props.navigation.goBack()}>
              <Icon name="undo" size={25} color="red" />
              <Text>Go Back</Text>
            </Button>
            <Button onPress={this.doSave}>
              <Icon name="check" size={25} color="green" />
              <Text>Save Changes</Text>
            </Button>
          </FooterTab>
        </Footer>
        <KeepAwake />
      </Container>
    );
  }
}
