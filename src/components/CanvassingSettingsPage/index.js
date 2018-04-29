import React, { PureComponent } from 'react';
import {
  TouchableHighlight,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

import t from 'tcomb-form-native';

var Form = t.form.Form;

var mainForm = t.struct({
  'show_all_pins': t.Boolean,
  'movable_pins': t.Boolean,
});

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
    };

    this.doSave = this.doSave.bind(this);
  }

  doSave = async () => {
    let { refer } = this.state;
    let json = this.refs.form.getValue();
    if (json == null) return;

    let epoch = Math.floor(new Date().getTime() / 1000);

    refer.forceUpdate();
    this.props.navigation.goBack();
  }

  render() {
    const { refer } = this.state;

    return (
      <ScrollView style={{flex: 1, padding: 15, backgroundColor: 'white'}}>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Form
           ref="mainForm"
           type={mainForm}
          />
        </TouchableWithoutFeedback>

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
