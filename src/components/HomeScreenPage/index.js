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
import SmLoginPage from '../SmLoginPage';
import Modal from 'react-native-simple-modal';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      user: null,
      moreOptions: false,
      SmLoginScreen: false,
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

    // TODO: this makes the button tap akward on high network latentcy
    let user = await _loginPing(this, true);

    if (user.loggedin) {
      navigate('Canvassing', {userId: user.id});
    } else {
      this.setState({ SmLoginScreen: true, goToCanvassing: true });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { SmLoginScreen, user, goToCanvassing } = this.state;
    if (prevState.SmLoginScreen && !SmLoginScreen && user.loggedin && goToCanvassing) {
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
    const { moreOptions, SmLoginScreen } = this.state;

    const homeImage = require('../../../img/UnitedNotSilenced.png')

    return (
    <View style={{flex: 1, backgroundColor: 'white'}}>

      <Image source={homeImage} style={{flex: 1, padding: 15, maxWidth: Dimensions.get('window').width}} resizeMode={'contain'} />

      {moreOptions &&
      <View style={{flex: 1}}>

        <View style={{margin: 5, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10}}
            onPress={() => {this.goToCanvassing();}}>
            <Text style={{textAlign: 'center'}}>Canvassing</Text>
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
             onPress={() => {this.setState({ moreOptions: false})}}>
            <Text style={{textAlign: 'center'}}>Main Menu</Text>
          </TouchableOpacity>
        </View>

      </View>
      ||
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
              onPress={() => {this.setState({ moreOptions: true})}}>
              <Text style={{textAlign: 'center'}}>More Options</Text>
            </TouchableOpacity>
          </View>
        </View>
        }

        <Modal
          open={SmLoginScreen}
          modalStyle={{width: 335, height: 400, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({SmLoginScreen: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <SmLoginPage refer={this} />
        </Modal>

      </View>
    );
  }
}
