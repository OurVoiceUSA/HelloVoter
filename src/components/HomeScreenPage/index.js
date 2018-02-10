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
import { _loginPing } from '../../common';
import DropboxLoginPage from '../DropboxLoginPage';
import Modal from 'react-native-simple-modal';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      user: null,
      DropboxLoginScreen: false,
      goToCanvassing: false,
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
    _loginPing(this, false);
  }

  goToCanvassing = async () => {
    const { navigate } = this.props.navigation;

    let user = await _loginPing(this, false);

    if (user.dropboxToken) {
      navigate('Canvassing', {userId: user.id});
    } else {
      this.setState({ DropboxLoginScreen: true, goToCanvassing: true });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { DropboxLoginScreen, user, goToCanvassing } = this.state;
    if (prevState.DropboxLoginScreen && !DropboxLoginScreen && user.dropboxToken && goToCanvassing) {
      this.goToCanvassing();
    }
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
    const { DropboxLoginScreen } = this.state;

    const homeImage = require('../../../img/HomeScreen.png')

    return (
    <View style={{flex: 1, backgroundColor: 'white'}}>

      <Image source={homeImage} style={{padding: 15, alignSelf: 'center', maxWidth: Dimensions.get('window').width}} resizeMode={'contain'} />

      <View style={{flex: 1, alignItems: 'center'}}>

        <View style={{margin: 5, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            onPress={() => {navigate('YourReps')}}>
            <Text style={{textAlign: 'center'}}>Your Representatives</Text>
          </TouchableOpacity>
        </View>

        <View style={{margin: 5, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            onPress={() => {navigate('Settings')}}>
            <Text style={{textAlign: 'center'}}>Your Voice</Text>
          </TouchableOpacity>
        </View>

        <View style={{margin: 5, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            onPress={() => {navigate('About')}}>
            <Text style={{textAlign: 'center'}}>About Our Voice</Text>
          </TouchableOpacity>
        </View>

        <View style={{margin: 5, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            onPress={() => {this.goToCanvassing();}}>
            <Text style={{textAlign: 'center'}}>Canvassing</Text>
          </TouchableOpacity>
        </View>

        <View style={{margin: 5, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            onPress={this._RVSpressHandler}>
            <Text style={{textAlign: 'center'}}>Register to Vote</Text>
          </TouchableOpacity>
        </View>

        <View style={{margin: 5, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            onPress={this._pressHandler}>
            <Text style={{textAlign: 'center'}}>Donate</Text>
          </TouchableOpacity>
        </View>

        </View>

        <Modal
          open={DropboxLoginScreen}
          modalStyle={{width: 335, height: 400, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({DropboxLoginScreen: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <DropboxLoginPage refer={this} />
        </Modal>

      </View>
    );
  }
}
