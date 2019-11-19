import React, { PureComponent } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Text } from  'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';
import SafariView from 'react-native-safari-view';
import jwt_decode from 'jwt-decode';
import { wsbase } from './config';
import { URL_PRIVACY_POLICY, say, _loginPing, _saveJWT, openURL } from './common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);
    this.state = { user: null };
  }

  _doCheck = async () => {
    const { refer } = this.props;

    var user = await _loginPing(this, true);

    if (user.loggedin) {
      refer.setState({user, SmLoginScreen: false});
      try {
        refer._loadForms();
      } catch (e) {}
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
  loginWithFacebook = () => openURL(wsbase+'/auth/fm');

  // Handle Login with Google button tap
  loginWithGoogle = (hint) => openURL(wsbase+'/auth/gm'+(hint?'?loginHint='+hint:''));

  render() {
    const { user } = this.state;
    const { refer } = this.props;

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

        <View style={{marginTop: 30}}>
          <Text note>
            For a better overall experience for everyone, certain application functions require a login.
            We value your privacy! Read our <Text note style={{fontWeight: 'bold', color: 'blue'}} onPress={() => openURL(URL_PRIVACY_POLICY)}>privacy policy</Text> for details.
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
