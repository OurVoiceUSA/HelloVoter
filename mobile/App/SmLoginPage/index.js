
import React, { PureComponent } from 'react';

import {
  Image,
  Linking,
  Platform,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import SafariView from 'react-native-safari-view';
import jwt_decode from 'jwt-decode';
import { wsbase } from '../config';
import { _loginPing, _saveJWT } from '../common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);
    this.state = { user: null };
  }

  _policyUrlHandler() {
    const url = "https://ourvoiceusa.org/wp-content/uploads/2018/10/Privacy-Policy1.pdf";
    return Linking.openURL(url).catch(() => null);
  }

  _doCheck = async () => {
    var user = await _loginPing(this, true);
    if (user.loggedin) {
      this.props.refer.setState({user: user, SmLoginScreen: false});
    } else if (user.id) {
      let type = user.id.split(":")[0];
      switch(type) {
        case "facebook": this.loginWithFacebook(); break;
        case "google": this.loginWithGoogle(user.id.split(":")[1]); break;
      }
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

  handleOpenURL = ({ url }) => {
    // Extract jwt token out of the URL
    const m = url.match(/jwt=([^#]+)/);

    if (m) _saveJWT(m[1]);

    this._doCheck();

    if (Platform.OS === 'ios') {
      SafariView.dismiss();
    }

  };

  // Handle Login with Facebook button tap
  loginWithFacebook = () => this.openURL(wsbase+'/auth/fm');

  // Handle Login with Google button tap
  loginWithGoogle = (hint) => this.openURL(wsbase+'/auth/gm'+(hint?'?loginHint='+hint:''));

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
      <View>
        {user && user.lastsmlogin &&
        <Text style={{fontSize: 20, textAlign: 'center', margin: 10}}>
          Welcome back! Your session has expired. Please login to continue.
        </Text>
        ||
        <Text style={{fontSize: 20, textAlign: 'center', margin: 10}}>
          Please login to continue
        </Text>
        }

        <View style={{margin: 5}}>
          <Icon.Button
            name="facebook"
            backgroundColor="#3b5998"
            onPress={this.loginWithFacebook}
            {...iconStyles}>
            Login with Facebook
          </Icon.Button>
        </View>
        <View style={{margin: 5}}>
          <Icon.Button
            name="google"
            backgroundColor="#DD4B39"
            onPress={() => {this.loginWithGoogle(null)}}
            {...iconStyles}>
            Login with Google
          </Icon.Button>
        </View>
        <View style={{margin: 5}}>
          <Icon.Button
            name="ban"
            backgroundColor="#d7d7d7"
            color="#000000"
            onPress={() => {
              this.props.refer.setState({SmLoginScreen: false, signupReturn: false});
            }}
            {...iconStyles}>
            No Thanks
          </Icon.Button>
        </View>

        <View style={{marginTop: 30}}>
          <Text style={{fontSize: 10, textAlign: 'justify'}}>
            For a better overall experience for everyone, certain application functions require a login.
            We value your privacy, any information you give us, stays with us.
            Read our <Text style={{fontSize: 10, fontWeight: 'bold', color: 'blue'}} onPress={() => {this._policyUrlHandler()}}>privacy policy</Text> for details.
          </Text>
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
