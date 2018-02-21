
import React, { PureComponent } from 'react';

import {
  Text,
  View,
  TouchableOpacity,
  TouchableHighlight,
  StyleSheet,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import { Dropbox } from 'dropbox';
import t from 'tcomb-form-native';

var Form = t.form.Form;

var mainForm = t.struct({
  'email': t.String,
});

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      form: props.navigation.state.params.form,
      dbx: props.navigation.state.params.dbx,
    };

    this.doShare = this.doShare.bind(this);
  }

  doShare = async () => {
    let { dbx, form } = this.state;

    let json = this.refs.mainForm.getValue();
    if (json == null) return;

    let SharingShareFolderLaunch;

    try {
      // create the folder with form.name
      SharingShareFolderLaunch = await dbx.sharingShareFolder({path: form.folder_path+'/'+form.name, force_async: false});
    } catch(error) {
      // TODO: only ignore if it's already shread
      console.warn(error);
    }
      // TODO: now rename the folder to the email address

    try {
      // finally, add the email address as a user on the folder
      await dbx.sharingAddFolderMember({
        shared_folder_id: SharingShareFolderLaunch.shared_folder_id,
        members: [{member: {email: json.email, '.tag': 'email'}, access_level: {'.tag': 'editor'}}],
        quiet: false,
        custom_message: 'You have been invited to the canvassing campaign '+form.name+' managed by '+form.author+'! Login to Dropbox with the Our Voice App to participate. Find links to download the mobile app here: https://ourvoiceusa.org/our-voice-app/',
      });
    } catch (error) {
      console.warn("error: "+error+" "+JSON.stringify(error));
    }

  }

  render() {
    return (
      <View style={styles.container}>

        <View style={{flex: 1, flexDirection: 'row', margin: 20, alignItems: 'center'}}>
          <Text>Share your Canvassing form with someone:</Text>
        </View>

        <Form
          ref="mainForm"
          type={mainForm}
        />
        <TouchableHighlight style={styles.button} onPress={this.doShare} underlayColor='#99d9f4'>
          <Text style={styles.buttonText}>Send Canvassing Invite</Text>
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

