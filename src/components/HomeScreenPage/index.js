import React, { PureComponent } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  TouchableOpacity,
  View,
  Text,
  PermissionsAndroid,
} from 'react-native';

import Permissions from 'react-native-permissions';
import { _loginPing } from '../../common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.requestPushPermission();
  }

  requestPushPermission = async () => {
    try {
      res = await Permissions.request('notification');
    } catch(error) {
      // nothing we can do about it
    }
  }

  render() {
    const { navigate } = this.props.navigation;

    const homeImage = require('../../../img/HomeScreen.png')

    return (
      <View style={{flex: 1, backgroundColor: 'white'}}>

        <Image source={homeImage} style={{padding: 15, alignSelf: 'center', maxWidth: Dimensions.get('window').width}} resizeMode={'contain'} />

        <View style={{flex: 1, alignItems: 'center'}}>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{
                backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20,
                height: 65, maxWidth: 350, justifyContent: 'center',
              }}
              onPress={() => {navigate('YourReps')}}>
              <Text style={{textAlign: 'center'}}>Your Representatives</Text>
            </TouchableOpacity>
          </View>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{
                backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20,
                height: 65, maxWidth: 350, justifyContent: 'center',
              }}
              onPress={() => {navigate('CanvassingSetup')}}>
              <Text style={{textAlign: 'center'}}>Canvassing</Text>
            </TouchableOpacity>
          </View>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{
                backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20,
                height: 65, maxWidth: 350, justifyContent: 'center',
              }}
              onPress={() => {navigate('About')}}>
              <Text style={{textAlign: 'center'}}>About Our Voice</Text>
            </TouchableOpacity>
          </View>

        </View>

      </View>
    );
  }
}
