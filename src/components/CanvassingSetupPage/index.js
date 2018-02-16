
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Dimensions,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import jwt_decode from 'jwt-decode';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/FontAwesome';
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
    let dbx = new Dropbox({ accessToken: user.dropbox.accessToken });
    let forms = [];

    // look for canvassing forms
    try {
      let res = await dbx.filesListFolder({path: '/canvassing'});
      for (let i in res.entries) {
        item = res.entries[i];
        if (!item.path_display.match(/\.jwt$/)) continue;

        // check if this folder has a jwt
        try {

          var data = await dbx.filesDownload({ path: item.path_display });
          let json = jwt_decode(data.fileBinary);

          forms.push(
            <View key={i} style={{margin: 5, flexDirection: 'row'}}>
              <TouchableOpacity
                style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
                onPress={() => {navigate('Canvassing', {dbx: dbx, form: json})}}>
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

    this.setState({ loading: false, forms: forms });
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


    if (!loading && !forms.length) forms.push(<View key={1}><Text>No Canvassing forms found in your dropbox. Canvassing forms are files with the .jwt file extention, and are needed for this tool to work.</Text></View>);

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}}>

        <View style={{margin: 20, alignItems: 'center'}}>
          <Text>You are logged into Dropbox as:</Text>
          <Text>{user.dropbox.name.display_name}</Text>
        </View>

        <View style={{margin: 20, marginTop: 0, alignItems: 'center'}}>
          <Text>Your Device ID is:</Text>
          <Text>{DeviceInfo.getUniqueID()}</Text>
        </View>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
            {loading &&
            <View style={{flex: 1, margin: 20, alignItems: 'center'}}>
               <Text>Loading data from Dropbox...</Text>
              <ActivityIndicator size="large" />
            </View>
            ||
            <View style={{flex: 1, alignItems: 'center'}}>
              <Text style={{margin: 10}}>Select a canvassing campaign:</Text>
              { forms }
            </View>
            }
        </View>

      </ScrollView>
    );
  }

}

