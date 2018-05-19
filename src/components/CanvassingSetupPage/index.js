
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import sha1 from 'sha1';
import Modal from 'react-native-simple-modal';
import storage from 'react-native-storage-wrapper';
import Icon from 'react-native-vector-icons/FontAwesome';
import DropboxLoginPage from '../DropboxLoginPage';
import { Dropbox } from 'dropbox';
import { _loginPing } from '../../common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      user: null,
      forms: [],
      dbx: null,
      connected: false,
      DropboxLoginScreen: false,
      JoinFormScreen: false,
    };

  }

  componentDidMount() {
    this._loadDBData();
  }

  _loadDBData = async () => {
    const { navigate } = this.props.navigation;
    let folders = [];
    let forms_local = [];

    this.setState({loading: true});

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
    } catch (error) {
      this.setState({connected: false});
      // failed to load - look locally
      try {
        forms_local = JSON.parse(await storage.get('OV_CANVASS_FORMS'));
      } catch (error) {
        console.warn(error);
      }
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
        json.folder_path = item.path_display.match('.*/')[0].slice(0, -1);

        forms_local.push(json);
      } catch(error) {
        // nothing to do
      }
    }

    if (!user.dropbox && forms_local === null) {
      // gendate a sample form for them
      forms_local = [{
          "id": sha1(new Date().getTime()),
          "created": Math.floor(new Date().getTime() / 1000),
          "name": "Sample Canvassing Form",
          "author": "Our Voice USA",
          "author_id": "ovusa:ThisIsASongThatNeverEnds",
          "version": 1,
          "questions": {
            "FullName":{"type":"String","label":"Full Name","optional":true},
            "Email":{"type":"String","label":"Email","optional":true},
            "Phone Number":{"type":"Number","label":"Phone","optional":true},
            "Notes":{"type":"TEXTBOX","label":"Notes","optional":true},
          },
      }];
    }

    for (let i in forms_local) {
      let json = forms_local[i];
      forms.push(
        <View key={i} style={{margin: 5, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            onPress={() => {navigate('Canvassing', {dbx: dbx, form: json, user: user})}}>
            <Text style={{fontWeight: 'bold'}}>{json.name}</Text>
            <Text style={{fontSize: 12}}>Created by {json.author}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // cache forms locally
    try {
      await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms_local));
    } catch (error) {
    }

    this.setState({ loading: false, forms: forms, dbx: dbx });
  }

  _canvassGuidelinesUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/OVMobile/blob/master/docs/Canvassing-Guidelines.md";
    return Linking.openURL(url).catch(() => null);
  }

  _canvassUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/OVMobile/blob/master/docs/Canvassing.md";
    return Linking.openURL(url).catch(() => null);
  }

  render() {
    const { loading, connected, user, forms } = this.state;
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
          <Text>No Canvassing forms found in your Dropbox. Ask someone who created one to share their form with you, or create a new one.</Text>
        </View>
      );
    }

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}} contentContainerStyle={{flexGrow:1}}>

        {user.dropbox &&
        <View style={{margin: 20, alignItems: 'center'}}>
          <Text>You are logged into Dropbox as:</Text>
          <Text>{user.dropbox.name.display_name}</Text>
        </View>
        ||
        <View style={{flexDirection: 'row', margin: 20}}>
          <Text>
            Canvass for any cause at zero cost! Use this tool to organize a canvassing campaign, or join an existing one.
          </Text>
        </View>
        }

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
              {!connected &&
              <Text style={{margin: 10, color: '#ff0000'}}>Not connected to Dropbox.</Text>
              }
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
              onPress={() => {
                if (user.dropbox)
                  navigate('CreateSurvey', {refer: this})
                else
                  this.setState({DropboxLoginScreen: true});
              }}>
              Create Canvassing Form
            </Icon.Button>
          </View>

          <View style={{margin: 12, marginTop: 0, alignItems: 'center'}}>
            <Icon.Button
              name="check-square"
              backgroundColor="#d7d7d7"
              color="black"
              onPress={() => {
                if (user.dropbox)
                  this.setState({JoinFormScreen: true});
                else
                  this.setState({DropboxLoginScreen: true});
              }}>
              Join an existing Form
            </Icon.Button>
          </View>

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
          open={this.state.DropboxLoginScreen}
          modalStyle={{width: 335, height: 400, backgroundColor: "transparent"}}
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

        <Modal
          open={this.state.JoinFormScreen}
          modalStyle={{width: 335, height: 400, backgroundColor: "transparent"}}
          style={{alignItems: 'center'}}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({JoinFormScreen: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <View style={{flex: 1, alignItems: 'center'}} ref="backgroundWrapper">
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: 335}}>
              <View style={{backgroundColor: 'white', padding: 40, borderRadius: 40, borderWidth: 10, borderColor: '#d7d7d7'}}>
                <View style={{margin: 10}}>
                  <Text style={{textAlign: 'justify'}}>
                    To join an existing form, ask the creator of that form to
                    shair it with you. They can do so by pressing the
                    "Share Form" button in the canvassing settings and entering
                    the email address you use for Dropbox. Then, accept the folder
                    share with Dropbox and reload this app.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    );
  }

}

const iconStyles = {
  justifyContent: 'center',
  borderRadius: 10,
  padding: 10,
};
