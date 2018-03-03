
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Platform,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  findNodeHandle,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import SafariView from 'react-native-safari-view';
import jwt_decode from 'jwt-decode';
import { Dropbox } from 'dropbox';
import { wsbase } from '../../config';
import { _loginPing, _saveUser } from '../../common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);
    this.state = { user: null };
  }

  _policyUrlHandler() {
    const url = "https://ourvoiceusa.org/mobile-app-privacy-policy/";
    return Linking.openURL(url).catch(() => null);
  }

  _doCheck = async () => {
    var refer = this.props.refer;
    let user = await _loginPing(this, false);
    if (user.dropbox) {
      let dbx = new Dropbox({ accessToken: user.dropbox.accessToken });

      // verify the token works
      dbx.filesListFolder({path: ''})
      .then(function(response) {
        // if this user is logged in, persist that to setstate
        if (refer.state.user.loggedin) user.loggedin = true;
        refer.setState({user: user, DropboxLoginScreen: false});
      })
      .catch(function(error) {
         console.warn(error);
      });
    }
  }

  // Set up Linking
  componentDidMount() {
    // Add event listener to handle OAuthLogin:// URLs
    Linking.addEventListener('url', this.handleOpenURL);
    // Launched from an external URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleOpenURL({ url });
      }
    });
    this._doCheck();
  }

  componentWillUnmount() {
    // Remove event listener
    Linking.removeEventListener('url', this.handleOpenURL);
  };

  handleOpenURL = async ({ url }) => {
    // Extract jwt token out of the URL
    const [, token] = url.match(/dropbox=([^#]+)/);

    try {
      let user = await _loginPing(this, false);
      user.dropbox = jwt_decode(token);
      await _saveUser(user, false);
    } catch(error) {
      console.warn(error);
    }
    this._doCheck();

    if (Platform.OS === 'ios') {
      SafariView.dismiss();
    }

  };

  // Handle Login with Dropbox button tap
  loginWithDropbox = () => this.openURL(wsbase+'/auth/dm');

  // Open URL in a browser
  openURL = (url) => {
    // Use SafariView on iOS
    if (Platform.OS === 'ios') {
      SafariView.show({
        url: url,
        fromBottom: true,
      });
    }
    // Or Linking.openURL on Android
    else {
      Linking.openURL(url);
    }
  };

  render() {
    const { user } = this.state;

    return (
      <View style={{flex: 1, alignItems: 'center'}} ref="backgroundWrapper">
        <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: 335}}>
          <View style={{backgroundColor: 'white', padding: 40, borderRadius: 40, borderWidth: 10, borderColor: '#d7d7d7'}}>
            <Text style={styles.header}>
              Data Sync Account
            </Text>

            <View style={{margin: 5}}>
              <Icon.Button
                name="dropbox"
                backgroundColor="#3d9ae8"
                onPress={this.loginWithDropbox}
                {...iconStyles}>
                Login with Dropbox
              </Icon.Button>
            </View>
            <View style={{margin: 5}}>
              <Icon.Button
                name="ban"
                backgroundColor="#d7d7d7"
                color="#000000"
                onPress={() => {
                  this.props.refer.setState({DropboxLoginScreen: false});
                }}
                {...iconStyles}>
                No Thanks
              </Icon.Button>
            </View>

            <View style={{marginTop: 30}}>
              <Text style={{fontSize: 10, textAlign: 'justify'}}>
                This tool requires a file sharing service to store and sync data.
                We value your privacy, your data remains private to your device and data sync account.
                Read our <Text style={{fontSize: 10, fontWeight: 'bold', color: 'blue'}} onPress={() => {this._policyUrlHandler()}}>privacy policy</Text> for details.
              </Text>
            </View>
          </View>

        </View>
      </View>
    );
  }
}

const iconStyles = {
  justifyContent: 'center',
  borderRadius: 10,
  padding: 10,
};

const styles = StyleSheet.create({
  header: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  text: {
    textAlign: 'center',
  },
  buttons: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    margin: 20,
    marginBottom: 30,
  },
});
