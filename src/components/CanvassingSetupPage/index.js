
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Text,
  View,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

import ModalPicker from 'react-native-modal-selector';
import Icon from 'react-native-vector-icons/FontAwesome';
import storage from 'react-native-storage-wrapper';
import { Dropbox } from 'dropbox';
import { _loginPing } from '../../common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      user: null,
      forms: [],
    };

  }

  componentDidMount() {
    this._loadDBData();

  }

  _loadDBData = async () => {
    const { navigate } = this.props.navigation;

    let user = await _loginPing(this, false);
    let dbx = new Dropbox({ accessToken: user.dropboxToken });
    let forms = [];

    // look for canvassing forms
    try {
      let res = await dbx.filesListFolder({path: ''});
      for (let i in res.entries) {
        item = res.entries[i];
        if (item['.tag'] != 'folder') continue;

        // check if this folder has a CanvassingForm.json
        try {

          var data = await dbx.filesDownload({ path: item.path_display+'/CanvassingForm.json' });
          let json = JSON.parse(data.fileBinary);

          forms.push(
            <View key={i} style={{margin: 5, flexDirection: 'row'}}>
              <TouchableOpacity
                style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
                onPress={() => {navigate('Canvassing', {form: json})}}>
                <Text style={{fontWeight: 'bold'}}>{json.name}</Text>
                <Text style={{fontSize: 12}}>Created by {json.author}</Text>
              </TouchableOpacity>
            </View>
          );
        } catch(error) {
          // nothing to do
        }
      }

    } catch (error) {
      console.warn(error);
    };

/*
    let newStruct = {};
    let newOptions = { fields: {} };
    let json = {};

    try {
      var data = await dbx.filesDownload({ path: '/Canvassing/test.txt' });
      json = JSON.parse(data.fileBinary);
    } catch(error) {
      console.warn("Err: "+error);
    }

    let keys = Object.keys(json.questions);
    for (let k in keys) {
      let value;
      switch (json.questions[keys[k]].type) {
        case 'Number': value = t.Number; break;
        case 'Boolean': value = t.Boolean; break;
        case 'SAD': value = SAD; break;
        default: value = t.String;
      }
      newStruct[keys[k]] = value;
      newOptions.fields[keys[k]] = { label: json.questions[keys[k]].label };
    }

    CanvassForm = t.struct(newStruct);
    options = newOptions;
*/

    this.setState({ loading: false, forms: forms });
  }

  saveValues() {
    const formValues = this.formGenerator.getValues();
    console.warn('FORM VALUES', formValues);
  }

  render() {
    const { loading, user, forms } = this.state;

    // wait for user object to become available
    if (!user) return (
        <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20}}>Loading user data...</Text>
          <ActivityIndicator />
        </View>
      );

    if (!loading && !forms.length) forms.push(<View key={1}><Text>No Canvassing forms found in your dropbox. A folder with a well formatted CanvassingForm.json file in it is needed for this tool to work.</Text></View>);

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}}>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
            {loading &&
<View>
            <Text>Loading data from Dropbox...</Text>
            <ActivityIndicator size="large" />
</View>
            ||
              <View style={{flex: 1}}>
<Text>Select a canvassing campaign:</Text>
              { forms }
              </View>
            }
        </View>

      </ScrollView>
    );
  }

}

