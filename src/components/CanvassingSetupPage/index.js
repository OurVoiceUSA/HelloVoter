
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Text,
  View,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import t from 'tcomb-form-native';
import sha1 from 'sha1';
import Modal from 'react-native-simple-modal';
import storage from 'react-native-storage-wrapper';
import Swipeout from 'react-native-swipeout';
import Icon from 'react-native-vector-icons/FontAwesome';
import SafariView from 'react-native-safari-view';
import jwt_decode from 'jwt-decode';
import SmLoginPage from '../SmLoginPage';
import { Dropbox } from 'dropbox';
import { _loginPing, _saveUser, _getApiToken } from '../../common';
import { wsbase } from '../../config';

var Form = t.form.Form;

var sampleForm = {
  "id": "sampleForm",
  "created": (new Date().getTime()),
  "name": "Sample Canvassing Form",
  "author": "Our Voice USA",
  "author_id": "sampleForm",
  "version": 1,
  "questions":{
    "FullName":{"type":"String","label":"Full Name","optional":true},
    "Email":{"type":"String","label":"Email Address","optional":true},
    "Puppy breed preferences":{"type":"SAND","label":"I prefer my puppies to be fuzzy and cute.","optional":true},
    "Puppy preferences":{"type":"Boolean","label":"Turn this switch ON if you prefer puppies stay outside.","optional":true},
    "Bad Puppy preferences":{"type":"SAND","label":"When puppies misbehave, I often shrug it off because hey, they're cute puppies.","optional":true},
    "Puppy breeds":{"type":"TEXTBOX","label":"Please list as many breeds of puppies you would like to have for your very own.","optional":true},
    "Puppy breed specify":{"type":"String","label":"Of the breeds you've listed, which style of puppy is your favorite? (There can be only one)","optional":true},
    "Number of puppies":{"type":"Number","label":"How many puppies can you hold in your arms without dropping any?","optional":true},
    "Puppy puddles":{"type":"Boolean","label":"Turn this switch ON if you dont mind mopping up puppy puddles.","optional":true},
    "Puppy trees":{"type":"String","label":"If your favorite breed of puppy could be any type of tree, what type of tree would your favorite fuzzy little puddle-making puppy choose?","optional":true},
  },
  "questions_order":["FullName","Email","Puppy breed preferences","Puppy preferences","Bad Puppy preferences","Puppy breeds","Puppy breed specify","Number of puppies","Puppy puddles","Puppy trees"],
}

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      user: null,
      forms: [],
      dbx: null,
      dbxformfound: false,
      SelectModeScreen: false,
      ConnectServerScreen: false,
      SmLoginScreen: false,
      server: (__DEV__?{server: wsbase.replace('https://','')}:null),
    };

    this.onChange = this.onChange.bind(this);
    this.doSave = this.doSave.bind(this);

    this.formServerItems = t.struct({
      server: t.String,
      ack: t.Boolean,
    });

    this.formServerOptions = {
      fields: {
        server: {
          label: 'Server Domain Name',
          help: 'Enter the domain name of the server you wish to connect to.',
          error: 'You must enter a domain name.',
        },
        ack: {
          label: 'Terms of Use',
          help: 'By checking this you acknowledge that the server to which you are connecting is not affiliated with Our Voice USA and the data you send and receive is governed by that server\'s terms of use.',
          error: 'You must acknowledge the terms of use.',
        },
      },
    };
  }

  onChange(server) {
    this.setState({server})
  }

  doSave = async () => {
    let json = this.refs.mainForm.getValue();
    if (json === null) return;

    if (json.ack !== true) {
      // need to correctly trigger this.formServerOptions.fields.ack.hasError
      return;
    }

    let ret = await this.singHello(json.server);

    if (ret.flag !== true) Alert.alert((ret.error?'Error':'Connection Successful'), ret.msg, [{text: 'OK'}], { cancelable: false });
  }

  singHello = async (server) => {
    const { navigate } = this.props.navigation;
    let ret;

    try {

      let jwt = await storage.get('OV_JWT');

      res = await fetch('https://'+server+'/canvass/v1/hello', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(jwt?jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({longitude: -118, latitude: 40}),
      });

      let auth_location = res.headers.get('x-sm-oauth-url');

      if (!auth_location || !auth_location.match(/^https:.*auth$/)) {
        // Invalid x-sm-oauth-url header means it's not a validy configured canvass-broker
        return {error: true, msg: "That server is not running software compatible with this mobile app."};
      }

      if (auth_location !== wsbase+'/auth') {
        return {error: true, msg: "Custom authentication not yet supported."};
      }

      switch (res.status) {
        case 200:
          // valid - break to proceed
          break;
/*
TODO: accept a 302 redirect to where the server really is - to make things simple for the end-user
        case 302:
          console.warn("Re-featch based on Location header")
          break;
*/
        case 400:
        case 401:
          this.setState({ConnectServerScreen: false}, () => setTimeout(() => this.setState({SmLoginScreen: true}), 500))
          return {error: false, flag: true};
        case 403:
          return {error: true, msg: "We're sorry, but your request to canvass with this server has been rejected."};
        default:
          return {error: true, msg: "Unknown error connecting to server."};
      }

      let body = await res.json();

      this.setState({ConnectServerScreen: false});

      if (body.data.ready !== true) return {error: false, msg: "The server said: "+body.msg};
      else {
        // TODO: use form data from body.data.forms[0] and save it in the forms_local cache
        // TODO: if there's more than one form in body.data.forms - don't navigate
        navigate('Canvassing', {server: server, dbx: null, form: sampleForm, user: this.state.user});
        return {error: false, flag: true};
      }
    } catch (e) {
      console.warn("error:"+e);
      return {error: true, msg: "Unable to make a connection to target server"};
    }

  }

  componentDidMount() {
    // Add event listener to handle OAuthLogin:// URLs
    Linking.addEventListener('url', this.handleOpenURL);
    // Launched from an external URL
    Linking.getInitialURL().then((url) => {
      if (url) this.handleOpenURL({ url });
    });

    this._loadForms();
  }

  componentWillUnmount() {
    // Remove event listener
    Linking.removeEventListener('url', this.handleOpenURL);
  };

  componentDidUpdate(prevProps, prevState) {
    const { SmLoginScreen, user } = this.state;
    if (prevState.SmLoginScreen && !SmLoginScreen && user.loggedin) {
      this.singHello(this.state.server.server);
    }
  }

  handleOpenURL = async ({ url }) => {
    // Extract jwt token out of the URL
    const [, token] = url.match(/dropbox=([^#]+)/);
    try {
      let user = await _loginPing(this, false);
      user.dropbox = jwt_decode(token);
      await _saveUser(user, false);

      // TODO: handle the navigate that would have been tapped had we already been logged in
    } catch(e) {
      console.warn("error: "+e);
    }

    if (Platform.OS === 'ios') {
      SafariView.dismiss();
    }

    this._loadForms();
  }

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

  _loadForms = async () => {
    const { navigate } = this.props.navigation;
    let folders = [];
    let forms_local = [];
    let dbxformfound = false;

    this.setState({loading: true});

    try {
      forms_local = JSON.parse(await storage.get('OV_CANVASS_FORMS'));
      if (forms_local === null) forms_local = [];
    } catch (e) {
      console.warn("error: "+e);
      return;
    }

    let user;
    let dbx;
    let forms = [];

    // look for canvassing forms
    try {
      user = await _loginPing(this, false);
      dbx = new Dropbox({ accessToken: user.dropbox.accessToken });
      let res = await dbx.filesListFolder({path: ''});
      for (let i in res.entries) {
        item = res.entries[i];
        if (item['.tag'] != 'folder') continue;
        folders.push(item.path_display);
      }
      this.setState({connected: true});
    } catch (e) {
    }

    let pro = [];

    for (let i in folders) {
      pro.push(dbx.filesDownload({ path: folders[i]+'/canvassingform.json' }));
    }

    let objs = await Promise.all(pro.map(p => p.catch(e => e)));
    for (let i in objs) {
      try {
        item = objs[i];
        if (item.error) continue;
        let json = JSON.parse(item.fileBlob);
        json.backend = "dropbox";
        json.folder_path = item.path_display.match('.*/')[0].slice(0, -1);

        for (let idx in forms_local) {
          if (forms_local[idx] === null || forms_local[idx].id === json.id) delete forms_local[idx];
        }

        forms_local.push(json);
      } catch(e) {
        console.warn("error: "+e);
      }
    }

    if (!user.dropbox && forms_local === null) {
      // gendate a sample form for them
      let id = sha1(new Date().getTime());
    }

    for (let i in forms_local) {
      let json = forms_local[i];
      if (json === null) continue;

      let icon = "mobile";
      let color = "black";
      let size = 30;

      if (json.backend === "dropbox") {
        icon = "dropbox";
        color = "#3d9ae8";
        size = 25;
        dbxformfound = true;
      }

      let swipeoutBtns = [
        {
          text: 'Edit',
          type: 'primary',
          onPress: () => {
            if (json.backend === "dropbox" && !user.dropbox) {
              this.openURL(wsbase+'/auth/dm');
              return;
            }
            navigate('CreateSurvey', {title: 'Edit Form', dbx: dbx, form: json, refer: this});
          },
        },
        {
          text: 'Delete',
          type: 'delete',
          onPress: () => {
            Alert.alert(
              'Delete Form',
              'Are you sure you wish to delete this form? All related canvassing data will be lost.',
              [
                {text: 'Yes', onPress: async () => {
                  try {
                    if (json.backend === "dropbox") {
                      await dbx.filesDeleteV2({path: json.folder_path});
                    }
                    delete forms_local[i];
                    await storage.del('OV_CANVASS_PINS@'+json.id);
                    await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms_local));
                    Alert.alert(
                      'Delete Success',
                      'You have deleted the form: '+json.name,
                      [{text: 'OK'}],
                      { cancelable: false }
                    );
                    this._loadForms();
                  } catch (e) {
                    Alert.alert(
                      'Delete Failed',
                      'There was an error deleting the form: '+json.name,
                      [{text: 'OK'}],
                      { cancelable: false }
                    );
                    console.warn("error: "+e);
                  }
                }},
                {text: 'No'},
              ], { cancelable: false }
            );
          },
        },
      ];

      if (user.dropbox && json.backend === "dropbox")
        if (this.state.connected !== true || user.dropbox.account_id !== json.author_id)
          swipeoutBtns.shift();

      forms.push(
        <View key={i} style={{margin: 5, flexDirection: 'row'}}>
          <Swipeout
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            right={swipeoutBtns}
            autoClose={true}>
            <TouchableOpacity
              onPress={() => {
                if (json.backend === "dropbox" && !user.dropbox)
                  this.setState({SelectModeScreen: true});
                else
                  navigate('Canvassing', {dbx: (json.backend === "dropbox" ? dbx : null), form: json, user: user});
              }}>
              <View style={{flexDirection: 'row'}}>
                <Icon style={{margin: 5, marginRight: 10}} name={icon} size={size} color={color} />
                <View>
                  <Text style={{fontWeight: 'bold'}}>{json.name}</Text>
                  <Text style={{fontSize: 12}}>Created by {json.author}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Swipeout>
        </View>
      );
    }

    // cache forms locally
    try {
      await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms_local));
    } catch (error) {
    }

    this.setState({dbxformfound, dbx, forms, loading: false, SelectModeScreen: (forms.length === 0)});
  }

  _canvassGuidelinesUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/OVMobile/blob/master/docs/Canvassing-Guidelines.md";
    return Linking.openURL(url).catch(() => null);
  }

  _canvassUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/OVMobile/blob/master/docs/Canvassing.md";
    return Linking.openURL(url).catch(() => null);
  }

  dropboxLogout = async () => {
    let { user } = this.state;
    if (user.dropbox)
      new Dropbox({ accessToken: user.dropbox.accessToken }).authTokenRevoke();
    delete user.dropbox;
    _saveUser(user, false);
    try {
      forms_local = JSON.parse(await storage.get('OV_CANVASS_FORMS'));
      if (forms_local !== null) {
        for (let idx in forms_local) {
          if (forms_local[idx] === null || forms_local[idx].backend === "dropbox") delete forms_local[idx];
        }
        await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms_local));
      }
    } catch (e) {
      console.warn("error: "+e)
    }
    this.props.navigation.goBack();
  }

  render() {
    const { connected, dbx, dbxformfound, loading, user, forms } = this.state;
    const { navigate } = this.props.navigation;

    // wait for user object to become available
    if (!user) return (
        <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20}}>Loading user data...</Text>
          <ActivityIndicator />
        </View>
      );

    if (!loading && !forms.length) {
      forms.push(
        <View key={1}>
          <Text>No Canvassing forms. Ask someone who created one to share their form with you, or create a new one.</Text>
        </View>
      );
    }

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}} contentContainerStyle={{flexGrow:1}}>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
            {loading &&
            <View style={{flex: 1, margin: 20, alignItems: 'center'}}>
               <Text>Loading data...</Text>
              <ActivityIndicator size="large" />
            </View>
            ||
            <View style={{flex: 1, alignItems: 'center'}}>
              <Text style={{margin: 10}}>Select a canvassing campaign:</Text>
              { forms }
            </View>
            }
        </View>

        <View>
          <View style={{width: Dimensions.get('window').width, height: 1, backgroundColor: 'lightgray'}} />

          <View style={{margin: 12, alignItems: 'center'}}>
            <Icon.Button
              name="plus-circle"
              backgroundColor="#d7d7d7"
              color="black"
              onPress={() => this.setState({SelectModeScreen: true})}>
              Start a new Canvassing Activity
            </Icon.Button>
          </View>

          {user.dropbox &&
          <View style={{margin: 12, marginTop: 0, alignItems: 'center'}}>

            <View style={{
                width: Dimensions.get('window').width,
                height: 1,
                backgroundColor: 'lightgray'
              }}
            />

            <View style={{margin: 20, alignItems: 'center'}}>
              <Text>You are logged into Dropbox as:</Text>
              <Text>{user.dropbox.name.display_name}</Text>
            </View>

            <Icon.Button
              name="dropbox"
              backgroundColor="#3d9ae8"
              color="#ffffff"
              onPress={() => {
                Alert.alert(
                  'Dropbox Logout',
                  'Are you sure you wish to logout of Dropbox?',
                  [
                    {text: 'Yes', onPress: () => this.dropboxLogout()},
                    {text: 'No'},
                  ], { cancelable: false }
                );
              }}>
              Dropbox Logout
            </Icon.Button>
          </View>
          }

          {!user.dropbox && dbxformfound &&
          <View style={{margin: 12, marginTop: 0, alignItems: 'center'}}>
            <Icon.Button
              name="dropbox"
              backgroundColor="#3d9ae8"
              color="#ffffff"
              onPress={() => this.setState({SelectModeScreen: true})}>
              Login with Dropbox
            </Icon.Button>
          </View>
          }

        </View>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{margin: 12}}>
          <Text>
            Need help using this tool? Check out our <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => {this._canvassUrlHandler()}}>
            canvassing documentation</Text> with useful articles and video demos.
          </Text>
        </View>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{margin: 12}}>
          <Text>
            By using this tool you acknowledge that you are acting on your own behalf, do not represent Our Voice USA
            or its affiliates, and have read our <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => {this._canvassGuidelinesUrlHandler()}}>
            canvassing guidelines</Text>. Please be courteous to those you meet.
          </Text>
        </View>

        <Modal
          open={this.state.SelectModeScreen}
          modalStyle={{width: 335, height: 500, backgroundColor: "transparent"}}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({SelectModeScreen: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <View style={{flex: 1, alignItems: 'center'}} ref="backgroundWrapper">
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: 335}}>
              <View style={{backgroundColor: 'white', padding: 20, borderRadius: 40, borderWidth: 10, borderColor: '#d7d7d7'}}>
                <Text style={styles.header}>
                  Select Canvassing Mode
                </Text>

                <View style={{margin: 5}}>
                  <Icon.Button
                    name="forward"
                    backgroundColor="#d7d7d7"
                    color="#000000"
                    onPress={() => navigate('Canvassing', {dbx: null, form: sampleForm})}
                    {...iconStyles}>
                    Demo with a Sample Form
                  </Icon.Button>
                </View>

                <View style={{margin: 5, marginTop: 0}}>
                  <Text style={{fontSize: 10, textAlign: 'justify'}}>
                    Jump right into the map with a pre-made form to get a feel for how this canvassing tool works.
                  </Text>
                </View>

                <View style={{margin: 5}}>
                  <Icon.Button
                    name="user-circle"
                    backgroundColor="#d7d7d7"
                    color="#000000"
                    onPress={() => navigate('CreateSurvey', {title: 'Solo Project', dbx: null, form: null, refer: this})}
                    {...iconStyles}>
                    Solo Project
                  </Icon.Button>
                </View>

                <View style={{margin: 5, marginTop: 0}}>
                  <Text style={{fontSize: 10, textAlign: 'justify'}}>
                    No login required; use the canvassing tool by yourself for a solo project. Uses your device for data storage.
                  </Text>
                </View>

                <View style={{margin: 5}}>
                  <Icon.Button
                    name="dropbox"
                    backgroundColor="#d7d7d7"
                    color="#000000"
                    onPress={() => {
                      if (user.dropbox) navigate('CreateSurvey', {title: 'Dropbox Project', dbx: dbx, form: null, refer: this})
                      else this.openURL(wsbase+'/auth/dm');
                    }}
                    {...iconStyles}>
                    Collaborate with Dropbox
                  </Icon.Button>
                </View>

                <View style={{margin: 5, marginTop: 0}}>
                  <Text style={{fontSize: 10, textAlign: 'justify'}}>
                    Login with a Dropbox account and share data with a small team. Uses Dropbox for data sharing & storage.
                  </Text>
                </View>

                <View style={{margin: 5}}>
                  <Icon.Button
                    name="cloud-upload"
                    backgroundColor="#d7d7d7"
                    color="#000000"
                    onPress={() => {
                      this.setState({SelectModeScreen: false}, () => setTimeout(() => this.setState({ConnectServerScreen: true}), 500))
                    }}
                    {...iconStyles}>
                    Connect to Server
                  </Icon.Button>
                </View>

                <View style={{margin: 5, marginTop: 0}}>
                  <Text style={{fontSize: 10, textAlign: 'justify'}}>
                    Join a large canvassing operation. Uses their server for data storage.
                  </Text>
                </View>

              </View>

            </View>
          </View>
        </Modal>

        <Modal
          open={this.state.ConnectServerScreen}
          modalStyle={{width: 335, height: 500, backgroundColor: "transparent"}}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({ConnectServerScreen: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <View style={{flex: 1, alignItems: 'center'}} ref="backgroundWrapper">
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: 335}}>
              <View style={{backgroundColor: 'white', padding: 20, borderRadius: 40, borderWidth: 10, borderColor: '#d7d7d7'}}>

                <Form
                  ref="mainForm"
                  type={this.formServerItems}
                  options={this.formServerOptions}
                  onChange={this.onChange}
                  value={this.state.server}
                />

                <TouchableOpacity style={{
                    backgroundColor: '#d7d7d7', padding: 10, borderRadius: 20,
                    alignItems: 'center',
                  }}
                  onPress={this.doSave}>
                  <Text>Connect to Server</Text>
                </TouchableOpacity>

              </View>
            </View>
          </View>
        </Modal>

        <Modal
          open={this.state.SmLoginScreen}
          modalStyle={{width: 335, height: 400, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({SmLoginScreen: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <SmLoginPage refer={this} />
        </Modal>

      </ScrollView>
    );
  }

}

const iconStyles = {
  borderRadius: 10,
  paddingLeft: 25,
  padding: 10,
};

const styles = StyleSheet.create({
  header: {
    fontSize: 16,
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
