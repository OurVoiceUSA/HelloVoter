import React, { PureComponent } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  TouchableOpacity,
  View,
  Text,
  PermissionsAndroid,
  WebView,
  Linking,
} from 'react-native';

import Permissions from 'react-native-permissions';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      moreOptions: "false",
    };

  }

  requestPushPermission = async () => {
    try {
      res = await Permissions.request('notification');
    } catch(error) {
      // nothing we can do about it
    }
  }

  componentDidMount() {
    this.requestPushPermission();
  }

  _pressHandler() {
    const url = "https://ourvoiceusa.org/donate-today-saves-tomorrow/";
    return Linking.openURL(url).catch(() => null);
  }

  _CNYpressHandler() {
    const url = "https://ourvoiceusa.org/directory/";
    return Linking.openURL(url).catch(() => null);
  }

  _RVSpressHandler() {
    const url = "https://www.eac.gov/voters/register-and-vote-in-your-state/";
    return Linking.openURL(url).catch(() => null);
  }

  render() {
    const { navigate } = this.props.navigation;
    const { moreOptions } = this.state;

    const homeImage = require('../../../img/UnitedNotSilenced.png')

    if (moreOptions === "true") {
      return (
      <View style={{flex: 1, backgroundColor: 'white'}}>

        <Image source={homeImage} style={{flex: 1, padding: 15, maxWidth: Dimensions.get('window').width}} resizeMode={'contain'} />

        <View style={{flex: 1}}>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10}}
              onPress={this._CNYpressHandler}>
              <Text style={{textAlign: 'center'}}>Candidate Directory</Text>
            </TouchableOpacity>
          </View>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10}}
              onPress={this._RVSpressHandler}>
              <Text style={{textAlign: 'center'}}>Register to Vote</Text>
            </TouchableOpacity>
          </View>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10}}
              onPress={this._pressHandler}>
              <Text style={{textAlign: 'center'}}>Donate</Text>
            </TouchableOpacity>
          </View>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10}}
              onPress={() => {this.setState({ moreOptions: "false"})}}>
              <Text style={{textAlign: 'center'}}>Main Menu</Text>
            </TouchableOpacity>
          </View>

        </View>

      </View>
      );
    }

    return (
      <View style={{flex: 1, backgroundColor: 'white'}}>

        <Image source={homeImage} style={{flex: 1, padding: 15, maxWidth: Dimensions.get('window').width}} resizeMode={'contain'} />

        <View style={{flex: 1}}>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10}}
              onPress={() => {navigate('YourReps')}}>
              <Text style={{textAlign: 'center'}}>Your Representatives</Text>
            </TouchableOpacity>
          </View>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10}}
              onPress={() => {navigate('Settings')}}>
              <Text style={{textAlign: 'center'}}>Your Voice</Text>
            </TouchableOpacity>
          </View>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10}}
              onPress={() => {navigate('About')}}>
              <Text style={{textAlign: 'center'}}>About Our Voice</Text>
            </TouchableOpacity>
          </View>

          <View style={{margin: 5, flexDirection: 'row'}}>
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10}}
              onPress={() => {this.setState({ moreOptions: "true"})}}>
              <Text style={{textAlign: 'center'}}>More Options</Text>
            </TouchableOpacity>
          </View>

        </View>

      </View>
    );
  }
}
