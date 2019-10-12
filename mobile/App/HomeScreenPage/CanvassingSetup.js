
import React, { PureComponent } from 'react';

import {
  Alert,
  View,
  Platform,
  TouchableOpacity,
} from 'react-native';

import { Container, Header, Content, Footer, FooterTab, Text, Button, Spinner } from 'native-base';

import { Dialog } from 'react-native-simple-dialogs';
import storage from 'react-native-storage-wrapper';
import Swipeout from 'react-native-swipeout';
import Prompt from 'react-native-input-prompt';
import Icon from 'react-native-vector-icons/FontAwesome';
import SafariView from 'react-native-safari-view';
import jwt_decode from 'jwt-decode';
import SmLoginPage from '../SmLoginPage';
import { ingeojson } from 'ourvoiceusa-sdk-js';
import { Divider, say, api_base_uri, DINFO, _loginPing, openURL } from '../common';
import { RNCamera } from 'react-native-camera';
import { wsbase } from '../config';

import RBush from 'rbush';
import rtree from '../../rtree.json';
import { geographies } from '../geographies';

import LocationComponent from '../LocationComponent';

export default class App extends LocationComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      dinfo: {},
      loading: true,
      user: null,
      forms: [],
      SelectModeScreen: false,
      SmLoginScreen: false,
      showLegacyDialog: false,
      server: null,
      serverLoading: false,
      myPosition: {latitude: null, longitude: null},
      showCamera: false,
    };
  }

  checkLocationAccess() {
    const { myPosition } = this.state;
    if (!this.state.locationAccess) {
      Alert.alert(say("location_access"), say("device_settings_deny_location"), [{text: say("ok")}], { cancelable: false });
      return false;
    }
    if (!myPosition.longitude || !myPosition.latitude) {
      Alert.alert(say("location_service"), say("location_services_unavailable"));
      return false;
    }
    return true;
  }

  navigate_canvassing(args) {
    const { navigate } = this.props.navigation;

    if (!this.checkLocationAccess()) return;

    navigate('Canvassing', args);
  }

  connectToGOTV = async() => {
    const { myPosition, orgId, inviteCode } = this.state;

    if (!this.checkLocationAccess()) return;

    let state;

    new RBush(9).fromJSON(rtree).search({
      minX: myPosition.longitude,
      minY: myPosition.latitude,
      maxX: myPosition.longitude,
      maxY: myPosition.latitude,
    }).forEach(bb => {
      let geo = geographies[bb.state];
      if (geo.geography) geo = geo.geography;
      if (ingeojson(geo, myPosition.longitude, myPosition.latitude))
        state = bb.state;
    });

    if (!state) return setTimeout(() => Alert.alert(say("out of bounds"), say("not_located_within_us_bounds"), [{text: say("ok")}], { cancelable: false }), 500);

    if (orgId && orgId.match(/^[0-9A-Z]*$/)) {
      // first two characters are the state code
      let place = this.state.orgId.substring(0,2).toLowerCase();

      this.connectToServer('gotv-'+place+'.ourvoiceusa.org', orgId, inviteCode);
    } else {
      setTimeout(() => Alert.alert('Error', say("must_enter_valid_qr_code"), [{text: say("ok")}], { cancelable: false }), 500);
    }
  }

  connectToServer = async(server, orgId, inviteCode) => {
    if (!this.checkLocationAccess()) return;

    this.setState({serverLoading: true, server});

    let ret = await this.singHello(server, orgId, inviteCode);

    if (ret.flag !== true) Alert.alert((ret.error?say("error"):say("connection_successful")), ret.msg, [{text: say("ok")}], { cancelable: false });
    if (ret.error !== true) server = null;

    this.setState({serverLoading: false});
  }

  sayHello = async (server, orgId, inviteCode) => {
    const { dinfo, myPosition } = this.state;

    if (!this.checkLocationAccess()) return;

    // mock a fetch object
    let res = {headers: {get: () => wsbase+'/auth'}, status: 404};
    try {
      let jwt = await storage.get('OV_JWT');

      try {
        // if the jwt doesn't have an id, discard it
        let obj = jwt_decode(jwt);
        if (!obj.id) throw "not a full user object";
      } catch (e) {
        await storage.del('OV_JWT');
        jwt = null;
      }

      let https = true;
      if (server.match(/:8080/)) https = false;

      res = await fetch('http'+(https?'s':'')+'://'+server+api_base_uri(orgId)+'/hello', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(jwt?jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          longitude: myPosition.longitude,
          latitude: myPosition.latitude,
          dinfo,
          inviteCode,
        }),
      });
      if (res.status === 400 || res.status === 401) await storage.del('OV_JWT');
    } catch (e) {
      if (orgId) res = {headers: {get: () => ''}, status: 404};
      console.warn("sayHello error: "+e);
    }
    return res;
  }

  singHello = async (server, orgId, inviteCode) => {
    const { navigate } = this.props.navigation;
    let ret;

    try {
      let res = await this.sayHello(server, orgId, inviteCode);
      let auth_location = res.headers.get('x-sm-oauth-url');

      if (!auth_location || !auth_location.match(/^https:.*auth$/)) {
        // Invalid x-sm-oauth-url header means it's not a validy configured canvass-broker
        if (orgId) return {error: true, msg: say("not_a_vlid_qr_code")}
        return {error: true, msg: say("not_running_compatible_software")};
      }

      if (auth_location !== wsbase+'/auth') {
        return {error: true, msg: say("custom_auth_not_supported")};
      }

      switch (res.status) {
        case 200:
          // valid - break to proceed
          break;
        case 400:
          return {error: true, msg: say("server_didnt_understand_request")};
        case 401:
          setTimeout(() => this.setState({SmLoginScreen: true}), 500);
          return {error: false, flag: true};
        case 403:
          return {error: true, msg: say("request_to_canvas_rejected")};
        default:
          return {error: true, msg: say("problem_connecting_try_again")};
      }

      let body = await res.json();

      if (body.data.ready !== true) return {error: false, msg: (body.msg?body.msg:say("awaiting_assignment"))};
      else {
        let forms = this.state.forms;
        let forms_server = [];
        let forms_local;

        this.setState({loading: true});

        try {
          forms_local = JSON.parse(await storage.get('OV_CANVASS_FORMS'));
          if (forms_local === null) forms_local = [];
        } catch (e) {
          console.warn("_loadForms 1: "+e);
          return;
        }

        let jwt = await storage.get('OV_JWT');
        for (let i = 0; i < body.data.forms.length; i++) {
          let https = true;
          if (server.match(/:8080/)) https = false;

          res = await fetch('http'+(https?'s':'')+'://'+server+api_base_uri(orgId)+'/form/get?formId='+body.data.forms[i].id, {
            headers: {
              'Authorization': 'Bearer '+(jwt?jwt:"of the one ring"),
              'Content-Type': 'application/json',
            },
          });

          // don't store a form error
          if (res.status !== 200) continue;

          let form = await res.json();
          form.server = server;
          form.backend = 'server';
          form.orgId = orgId,

          forms_server.push(form);

          // prevent duplicates
          if (forms_local.map(f => (f?f.id:null)).indexOf(form.id) === -1) forms_local.push(form);
        }

        try {
          await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms_local));
        } catch (error) {
        }

        this.setState({forms, loading: false});

        // if there's more than one form in body.data.forms, don't navigate
        if (forms_server.length === 1) {
          this.navigate_canvassing({server, orgId, form: forms_server[0], user: this.state.user, refer: this});
        }
        await this._loadForms();
        return {error: false, flag: true};
      }
    } catch (e) {
      console.warn("singHello: "+e);
      return {error: true, msg: say("unexpected_error_try_again")};
    }

  }

  componentDidMount() {
    this._doSetup();
    this._loadForms();
  }

  _doSetup = async () => {
    let dinfo = await DINFO();
    this.setState({dinfo});

    let access = await this.requestLocationPermission();

    let inviteUrl = await storage.get('HV_INVITE_URL');

    if (access && inviteUrl) {
      await storage.del('HV_INVITE_URL');
      this.parseInvite(inviteUrl);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { SmLoginScreen, server, user, orgId, inviteCode, signupReturn } = this.state;
    if (prevState.SmLoginScreen && !SmLoginScreen && user.loggedin) {
      if (server || inviteCode) this.connectToServer(server, orgId, inviteCode);
      if (signupReturn) this._signupUrlHandler();
    }
  }

  _loadForms = async () => {
    const { navigate } = this.props.navigation;
    const { refer } = this.state;

    let folders = [];
    let forms_local = [];

    this.setState({loading: true});

    try {
      forms_local = JSON.parse(await storage.get('OV_CANVASS_FORMS'));
      if (forms_local === null) forms_local = [];
    } catch (e) {
      console.warn("_loadForms 1: "+e);
      return;
    }

    let user;
    let forms = [];

    // look for canvassing forms
    try {
      user = await _loginPing(this, false);
    } catch (e) {
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
      }

      if (json.backend === "server") {
        icon = "cloud-upload";
        size = 25;

        // atempt to re-pull the form to see if it's changed
        try {
          let jwt = await storage.get('OV_JWT');
          let https = true;
          if (json.server.match(/:8080/)) https = false;
          let res = await fetch('http'+(https?'s':'')+'://'+json.server+api_base_uri(json.orgId)+'/form/get?formId='+json.id, {
            headers: {
              'Authorization': 'Bearer '+(jwt?jwt:"of the one ring"),
              'Content-Type': 'application/json',
            },
          });

          // don't store a form error
          if (res.status === 200) {
            let server = json.server;
            let orgId = json.orgId;
            json = await res.json();
            json.server = server;
            json.backend = 'server';
            json.orgId = orgId;

            forms_local[i] = json;
          }

          // user cannot see this form
          if (res.status === 403) {
            json = {deleted:true};
            forms_local[i] = json;
          }
        } catch (e) {
          console.warn(""+e);
        }
      }

      let swipeoutBtns = [
        {
          text: say("delete"),
          type: 'delete',
          onPress: () => {
            Alert.alert(
              say("delete_form"),
              say("confirm_delete_form"),
              [
                {text: say("yes"), onPress: async () => {
                  try {
                    delete forms_local[i];
                    await storage.del('OV_CANVASS_PINS@'+json.id);
                    await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms_local));
                    Alert.alert(
                      say("delete_success"),
                      say("have_deleted_form")+': '+json.name,
                      [{text: say("ok")}],
                      { cancelable: false }
                    );
                    this._loadForms();
                  } catch (e) {
                    Alert.alert(
                      say("delete_failed"),
                      translage("error_delete_form")+': '+json.name,
                      [{text: say("ok")}],
                      { cancelable: false }
                    );
                    console.warn("_loadForms 3: "+e);
                  }
                }},
                {text: say("no")},
              ], { cancelable: false }
            );
          },
        },
      ];

      let createdby = say("created_by")+' '+json.author;

      if (json.backend === 'server') {
        if (json.orgId) createdby = say("org_id")+' '+json.orgId;
        else createdby = say("hosted_by")+' '+json.server;
      }

      if (!json.deleted) {
        forms.push(
        <View key={i} style={{margin: 5, flexDirection: 'row'}}>
          <Swipeout
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            right={swipeoutBtns}
            autoClose={true}>
            <TouchableOpacity
              onPress={async () => {
                if (json.backend === "server") {
                  // TODO: set loading state as this can take a few seconds
                  let ret = await this.sayHello(json.server, json.orgId);
                  if (ret.status === 200) this.navigate_canvassing({server: json.server, orgId: json.orgId, form: json, user: user, refer: this});
                  else setTimeout(() => this.setState({SmLoginScreen: true}), 500);
               } else {
                 this.setState({showLegacyDialog: true});
               }
              }}>
              <View style={{flexDirection: 'row'}}>
                <Icon style={{margin: 5, marginRight: 10}} name={icon} size={size} color={color} />
                <View>
                  <Text style={{fontWeight: 'bold'}}>{json.name}</Text>
                  <Text style={{fontSize: 12}}>{createdby}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Swipeout>
        </View>
        );
      }
    }

    // cache forms locally
    try {
      forms_local = forms_local.filter((f) => {
        // don't store non-objects
        if (f === null || typeof f !== "object") return false;
        // don't store deleted forms
        return !f.deleted;
      });
      await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms_local));
    } catch (error) {
    }

    this.setState({forms, loading: false, SelectModeScreen: (forms.length === 0)});
  }

  _tosUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/HelloVoter/blob/master/docs/Canvassing-Guidelines.md";
    return openURL(url);
  }

  _signupUrlHandler() {
    const url = "https://docs.google.com/forms/d/1YF90nYiem5FeBflrkPTQSdjFEOAm55SVkSf7QtB-nBw/viewform";
    return openURL(url);
  }

  _canvassUrlHandler() {
    const url = "https://github.com/OurVoiceUSA/HelloVoter/blob/master/docs/Canvassing.md";
    return openURL(url);
  }

  parseInvite(url) {
    let obj = {};

    this.setState({showCamera: false, SelectModeScreen: false, askOrgId: false});

    try {
      // Why oh why is the "new URL()" object not implemented in RN?!? gah
      // brings me back to my perl days with ugly one liners. Ahh, the nostalgia! convert URI key/values to object
      url.split('?')[1].split('&').forEach(p => {
        const [p1,p2] = p.split('=');
        obj[p1] = p2;
      });

      // orgId means GOTV
      if (obj.orgId) this.setState({orgId: obj.orgId, inviteCode: obj.inviteCode}, () => this.connectToGOTV());
      else this.setState({server: obj.server, inviteCode: obj.inviteCode}, () => this.connectToServer(obj.server, null, obj.inviteCode));
    } catch (e) {
      console.warn(""+e);
    }
  }

  render() {
    const {
      showCamera, dinfo, loading, user, forms,
      askOrgId, SelectModeScreen, SmLoginScreen, showLegacyDialog,
    } = this.state;
    const { navigate } = this.props.navigation;

    // wait for user object to become available
    if (!user) return (
        <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20}}>{say("loading_user_data")}...</Text>
          <Spinner />
        </View>
      );

    if (!loading && !forms.length) {
      forms.push(
        <View key={1}>
          <Text>{say("no_canvas_forms_ask_someone")}</Text>
        </View>
      );
    }

    // if camera is open, render just that
    if (showCamera) return (
      <RNCamera
        ref={ref => {this.camera = ref;}}
        style={{
          flex: 1,
          justifyContent: 'space-between',
        }}
        androidCameraPermissionOptions={{
         title: say("permission_use_camera"),
          message: say("we_need_permission_use_camera"),
          buttonPositive: say("ok"),
          buttonNegative: say("cancel"),
        }}
        onBarCodeRead={(b) => this.parseInvite(b.data)}
        barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
      />
    );

    return (
      <View>

        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
            {loading &&
            <View style={{flex: 1, margin: 20, alignItems: 'center'}}>
              <Text>{say("loading_data")}...</Text>
              <Spinner />
            </View>
            ||
            <View style={{flex: 1, alignItems: 'center'}}>
              <Text style={{margin: 10}}>{say("select_canvassing_campaign")}:</Text>
              { forms }
            </View>
            }
        </View>

        <View>
          <Divider />

          <View style={{margin: 12, alignItems: 'center'}}>
            <Icon.Button
              name="plus-circle"
              backgroundColor="#d7d7d7"
              color="black"
              onPress={() => this.setState({SelectModeScreen: true})}>
              {say("start_new_canvas_activity")}
            </Icon.Button>
          </View>
        </View>

        <Divider />

        <View style={{margin: 12}}>
          <Text>
            {say("need_help_using_tool")} <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => {this._canvassUrlHandler()}}>
            {say("canvassing_documentation")}</Text> {say("with_useful_articles")}
          </Text>
        </View>

        <Divider />

        <View style={{margin: 12}}>
          <Text>
            {say("using_tool_you_acknowledge")} <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => {this._tosUrlHandler()}}>
            {say("canvassing_guidelines")}</Text>. {say("be_courteous_to_those")}
          </Text>
        </View>

        <Dialog
          title={say("start_new_canvas_activity")}
          visible={SelectModeScreen}
          animationType="fade"
          onTouchOutside={() => this.setState({SelectModeScreen: false})}>
          <View>

            <Button block bordered dark onPress={() => this.setState({showCamera: true})}>
              <Icon name="qrcode" {...iconStyles} />
              <Text>{say("scan_qr_code")}</Text>
            </Button>
            <Text style={{fontSize: 12, marginBottom: 10, textAlign: 'justify'}}>{say("join_existing_effort")}</Text>

            <Button block bordered dark onPress={() => this.setState({SelectModeScreen: false, askOrgId: true})}>
              <Icon name="id-badge" {...iconStyles} />
              <Text>{say("org_id")}</Text>
            </Button>
            <Text style={{fontSize: 12, marginBottom: 10, textAlign: 'justify'}}>{say("didnt_receive_qr_code")}</Text>

            <Button block bordered dark onPress={() => {
              if (!user.id) {
                this.setState({SelectModeScreen: false, SmLoginScreen: true, signupReturn: true});
              } else {
                this._signupUrlHandler();
              }
            }}>
              <Icon name="clipboard" {...iconStyles} />
              <Text>{say("org_id_signup")}</Text>
            </Button>
            <Text style={{fontSize: 12, marginBottom: 10, textAlign: 'justify'}}>{say("org_id_signup_subtext")}</Text>

            {(__DEV__&&dinfo.Emulator)&&
            <View>
              <Button block bordered dark onPress={() => {
                this.setState({SelectModeScreen: false});
                this.connectToServer((Platform.OS === 'ios'?'localhost':'10.0.2.2')+':8080')}
              }>
                <Icon name="code" {...iconStyles} />
                <Text>Local Dev</Text>
              </Button>
              <Text style={{fontSize: 12, marginBottom: 10, textAlign: 'justify'}}>
                Connect to your localhost development instance of HelloVoterAPI
              </Text>
            </View>
            }

          </View>

        </Dialog>

        <Dialog
          visible={SmLoginScreen}
          animationType="fade"
          onTouchOutside={() => this.setState({SmLoginScreen: false})}>
          <SmLoginPage refer={this} />
        </Dialog>

        <Dialog
          visible={showLegacyDialog}
          animationType="fade"
          onTouchOutside={() => this.setState({showLegacyDialog: false})}>
          <Text>
            Thanks for using this tool to canvas! Due to unforeseen circumstances, we are no
            longer able to integrate with Dropbox. To continue canvassing with this tool, you
            need to sign up for an Organization ID.
          </Text>
          <Button block style={{margin: 10}}><Text>Sign up for an Organization ID</Text></Button>
          <Text>
            If you'd like to transfer your canvassing data from your Dropbox account into
            your new Org account, share the Dropbox folder you used for canvassing with
            tech@ourvoiceusa.org and we will take care of that for you.
          </Text>
        </Dialog>

        <Prompt
          autoCorrect={false}
          autoCapitalize={"characters"}
          visible={askOrgId}
          title={say("org_id")}
          belowInputRender={() => (<Text style={{marginBottom: 10}}>{say("no_qr_code_please_ask")}</Text>)}
          placeholder={say("enter_org_id_example")+': NCC1701'}
          submitText={say("lets_do_this")}
          onCancel={() => this.setState({askOrgId: false})}
          onSubmit={text => this.setState({orgId: text, askOrgId: false}, () => this.connectToGOTV())}
        />

      </View>
    );
  }

}

const iconStyles = {
  borderRadius: 10,
  paddingLeft: 25,
  padding: 10,
  size: 25,
};
