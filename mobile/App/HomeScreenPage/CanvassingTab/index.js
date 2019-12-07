import React, { PureComponent } from 'react';
import { View, Dimensions, Image } from 'react-native';
import {
  Content, List, ListItem, Left, Right, Body, Footer, FooterTab,
  Text, Button, Spinner, H1,
} from 'native-base';

import LocationComponent from '../../LocationComponent';
import { HVConfirmDialog } from '../../HVComponent';
import SmLogin from '../../SmLogin';
import NewOrg from './NewOrg';

import Icon from 'react-native-vector-icons/FontAwesome';
import { sleep, asyncForEach } from 'ourvoiceusa-sdk-js';
import { Dialog } from 'react-native-simple-dialogs';
import storage from 'react-native-storage-wrapper';
import * as Progress from 'react-native-progress';
import KeepAwake from 'react-native-keep-awake';
import Prompt from 'react-native-input-prompt';
import { RNCamera } from 'react-native-camera';
import jwt_decode from 'jwt-decode';
import SunCalc from 'suncalc';

import {
  DINFO, STORAGE_KEY_JWT, STORAGE_KEY_OLDFORMS, URL_GUIDELINES, URL_HELP,
  Divider, say, _getApiToken, api_base_uri, _loginPing, openURL, openDonate, getUSState, localaddress,
} from '../../common';
import { wsbase } from '../../config';

var darkoutside = require('../../../img/darkoutside.png');
var lockedout = require('../../../img/lockedout.png');
var genericerror = require('../../../img/error.png');
var usaonly = require('../../../img/usaonly.png');
var lost = require('../../../img/whereami.png');
var crowd = require('../../../img/crowd.png')
var stop = require('../../../img/stop.png');

const PROCESS_MAX_WAIT = 100;

export default class App extends LocationComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      dinfo: {},
      loading: true,
      connectmode: false,
      waitmode: false,
      waitprogress: 0,
      canvaslater: null,
      error: false,
      user: null,
      myOrgID: null,
      servers: [],
      SelectModeScreen: false,
      server: null,
      myPosition: {latitude: null, longitude: null},
      showCamera: false,
      newOrg: false,
    };
  }

  checkLocationAccess() {
    const { myPosition } = this.state;
    if (!this.state.locationAccess) {
      this.alert(say("location_access"), say("device_settings_deny_location"));
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
    const { state, orgId, inviteCode } = this.state;

    if (!this.checkLocationAccess()) return;

    if (!state) {
      this.setState({canvaslater: 451});
      return this.alert(say("out_of_bounds"), say("not_located_within_us_bounds"));
    }

    if (orgId && orgId.match(/^[0-9A-Z]*$/)) {
      // first two characters are the state code
      let place = this.state.orgId.substring(0,2).toLowerCase();

      this.connectToServer('gotv-'+place+'.ourvoiceusa.org', orgId, inviteCode);
    } else {
      this.alert('Error', say("must_enter_valid_qr_code"));
    }
  }

  connectToServer = async(server, orgId, inviteCode) => {
    const { user } = this.state;

    if (!this.checkLocationAccess()) return;

    this.setState({server, inviteCode});

    if (user && user.loggedin) await this.sayHello(server, orgId, inviteCode);
  }

  recursiveProgress(i) {
    const { waitmode } = this.state;
    if (waitmode && i <= PROCESS_MAX_WAIT) {
      let n = i+1;
      this.setState({waitprogress: n});
      setTimeout(() => this.recursiveProgress(n), 666);
    }
  }

  sayHello = async (server, orgId, inviteCode) => {
    const { dinfo, myPosition } = this.state;
    let { servers } = this.state;
    let canvaslater;

    if (!this.checkLocationAccess()) return;

    let now = new Date();
    let times = SunCalc.getTimes(now, myPosition.latitude, myPosition.longitude);
    if (!__DEV__ && (now < times.sunrise || now > times.sunset)) {
      this.setState({canvaslater: 409});
      return;
    }

    this.setState({connectmode: true});

    let res;
    let jwt;

    let https = true;
    if (server.match(/:8080/)) https = false;

    try {
      jwt = await _getApiToken();
      // if the jwt doesn't have an id, discard it
      let obj = jwt_decode(jwt);
      if (!obj.id) throw "not a full user object";
    } catch (e) {
      await storage.del(STORAGE_KEY_JWT);
      this.setState({user: {profile:{}}, waitmode: false});
      return;
    }

    let retry = true;
    let skiperr = true;
    for (let retrycount = 0; (retrycount < (PROCESS_MAX_WAIT/10) && retry); retrycount++) {
      try {
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
        switch (res.status) {
          case 200:
            retry = false;
            canvaslater = null;
            break;
          case 401:
            this.setState({user: {profile:{}}, connectmode: false, waitmode: false});
            return;
          case 418:
            if (retrycount === 0) this.setState({connectmode: false, waitmode: true, waitprogress: 0}, () => this.recursiveProgress(0));
            canvaslater = null;
            await sleep(12345);
            break;
          default:
            // allow for one error to happen without bombing
            if (skiperr) {
              skiperr = false;
              canvaslater = null;
              await sleep(12345);
            } else {
              retry = false;
              canvaslater = res.status;
            }
            break;
        }
      } catch (e) {
        console.warn("sayHello error: "+e);
      }
    }

    setTimeout(() => this.setState({connectmode: false, waitmode: false, canvaslater}), 500);

    if (retry) {
      this.setState({error: true});
      console.warn("retry failed");
    }
    if (retry || canvaslater) return;

    let json = await res.json();
    if (json.data) json = json.data;

    let list = json.forms;

    await this.addServer(server, orgId, list);

    if (list.length) {
      let forms = [];

      // TODO: use Promise.all (will need to dedupe list form.id first)
      await asyncForEach(list, async (f) => {
        // if this formId is already in forms, bail
        if (forms.find(ff => ff.id === f.id)) return;

        res = await fetch('http'+(https?'s':'')+'://'+server+api_base_uri(orgId)+'/form/get?formId='+f.id, {
          headers: {
            'Authorization': 'Bearer '+(jwt?jwt:"of the one ring"),
            'Content-Type': 'application/json',
          },
        });

        forms.push(await res.json());
      });

      this.navigate_canvassing({server, orgId, forms, refer: this});
    } else {
      this.alert("Awaiting Assignment","You are not assigned to a form for this organization. Please contact your administrator.");
    }
  }

  addServer = async (server, orgId, forms) => {
    let add = true;

    let servers = await this.getServers();

    servers.forEach(s => {
      if (s.orgId && orgId) {
        if (s.orgId === orgId) {
          add = false;
          if (forms) s.forms = forms;
        }
      } else if (s.server === server) {
        add = false;
        if (forms) s.forms = forms;
      }
    });

    if (add) servers.push({server, orgId, forms});

    await storage.set('HV_SERVERS', JSON.stringify(servers));
    this.setState({servers});
  }

  componentDidMount() {
    DINFO()
    .then(dinfo => this.setState({dinfo}, () => this._doSetup()))
    .catch(e => {
      this.setState({error: true})
      console.warn(e);
    });
  }

  _doSetup = async () => {
    const { dinfo } = this.state;
    let user;

    await this.requestLocationPermission();

    if (!this.checkLocationAccess()) {
      this.setState({locationDenied: true});
      return;
    }

    try {
      user = await _loginPing(this, true);
      this.setState({user});
    } catch (e) {
      console.warn(e);
      this.setState({error: true});
      return;
    }

    let inviteUrl = await storage.get('HV_INVITE_URL');

    if (access && inviteUrl) {
      await storage.del('HV_INVITE_URL');
      this.parseInvite(inviteUrl);
    }

    this.setState({state: getUSState(this.state.myPosition)}, () => {
      if (user.loggedin) this._loadForms();
      else this.setState({loading: false});
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const { server, user, orgId, inviteCode } = this.state;
    if ((prevState.user === null || (prevState.user && !prevState.user.loggedin)) && user && user.loggedin) {
      if (server || inviteCode) this.connectToServer(server, orgId, inviteCode);
    }
  }

  getServers = async () => {
    let servers = [];

    try {
      servers = JSON.parse(await storage.get('HV_SERVERS'));
      if (servers === null) servers = [];
    } catch (e) {
      console.warn("_loadForms 1: "+e);
      return;
    }
    return servers;
  }

  _loadForms = async () => {
    const { navigate } = this.props.navigation;
    const { user, refer, state } = this.state;

    let jwt;
    let myOrgID;
    let forms_local = [];

    this.setState({loading: true});

    // get legacy forms
    try {
      forms_local = JSON.parse(await storage.get(STORAGE_KEY_OLDFORMS));
      if (forms_local !== null) {
        for (let i in forms_local) {
          let json = forms_local[i];
          if (json === null) continue;

          // if dropbox and not signed in, or not the author, ignore it
          if (json.backend === "dropbox" && !user.dropbox) continue;
          if (json.backend === "dropbox" && user.dropbox.account_id !== json.author_id) continue;
          // auto-convert legacy forms
          if (json.backend !== "server") return navigate('ConvertLegacy', {refer: this, state, user, myPosition});

          await this.addServer(json.server, json.orgId);
        }
      }
    } catch (e) {
      console.warn("_loadForms 2: "+e);
      return;
    }

    // poll for myOrgID
    try {
      jwt = await _getApiToken();

      let res = await fetch('https://gotv-'+state.toLowerCase()+'.ourvoiceusa.org/orgid/v1/status', {
        headers: {
          'Authorization': 'Bearer '+(jwt?jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 200) {
        let json = await res.json();
        myOrgID = json.orgid;

        if (myOrgID && myOrgID.length) {
          await this.addServer('gotv-'+state.toLowerCase()+'.ourvoiceusa.org', myOrgID);
          this.setState({myOrgID});
        }
      }
      else if (res.status === 400 || res.status === 401) this.setState({user: {profile:{}}});
      else if (res.status < 500) this.setState({canvaslater: res.status});

    } catch (e) {
      console.warn(e);
    }

    let servers = await this.getServers();

    this.setState({servers, loading: false, SelectModeScreen: (servers.length === 0)});
  }

  parseInvite(url) {
    let obj = {};

    this.setState({showCamera: false, newOrg: false, SelectModeScreen: false, askOrgId: false});

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
      showCamera, newOrg, dinfo, loading, user, forms, error, locationDenied,
      askOrgId, SelectModeScreen, myOrgID, connectmode, waitmode, waitprogress,
      canvaslater,
    } = this.state;
    const { navigate } = this.props.navigation;

    if (locationDenied) return (<NotRightNow refer={this} image={lost} title="Location Unknown" message="" />);

    if (canvaslater || error) {
      switch (canvaslater) {
        case 402: return (<NotRightNow refer={this} image={crowd} title="Quota Exceeded" message="Your organization has used our services so heavily that we cannot offer it to you for free anymore. Become a patron to continue to use our services." patreon={true} />);
        case 403: return (<NotRightNow refer={this} image={lockedout} title="Locked Out" message="You have been locked out of this organization. Please contact your organization administrator." />);
        case 409: return (<NotRightNow refer={this} image={darkoutside} title="It's Dark Outside" message="Whoa there! The sun's not up. Relax and try again later." youtube={true} />);
        case 410: return (<NotRightNow refer={this} image={stop} title="Suspended" message="This organization has been suspended due to a Terms of Service violation. Please contact your organization administrator." />);
        case 420: return (<NotRightNow refer={this} image={crowd} title="At Capacity" message="It's getting crowded up in here! Our systems are at capacity. Please try back at another time, or become a patron and our systems will prioritize your activities over others." patreon={true} />);
        case 451: return (<NotRightNow refer={this} image={usaonly} title="Geography Error" message="This app is only intended to be used in the USA." />);
        default: return (<NotRightNow refer={this} image={genericerror} title="Error" message={say("unexpected_error_try_again")+" Becoming a patron will help us reduce these errors."} patreon={true} />);
      }
    }

    // wait for user object to become available
    if (!user || loading) return (
        <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20}}>{say("loading_user_data")}...</Text>
          <Spinner />
        </View>
      );

    if (!user.loggedin) return (
      <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
        <SmLogin refer={this} />
      </View>
      );

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

    if (newOrg) return (<NewOrg refer={this} />);

    return (
      <Content>
        <List>
          <ListItem itemDivider icon>
            <Text>{say("select_canvassing_campaign")}:</Text>
          </ListItem>
          <ServerList refer={this} />
        </List>

        <Button block danger onPress={() => this.setState({SelectModeScreen: true})}>
          <Icon name="plus-circle" backgroundColor="#d7d7d7" color="white" size={30} />
          <Text>{say("start_new_canvas_activity")}</Text>
        </Button>

        <Divider />

        <View style={{margin: 12}}>
          <Text>
            {say("need_help_using_tool")} <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => openURL(URL_HELP)}>
            {say("canvassing_documentation")}</Text> {say("with_useful_articles")}
          </Text>
        </View>

        <Divider />

        <View style={{margin: 12}}>
          <Text>
            {say("using_tool_you_acknowledge")} <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => openURL(URL_GUIDELINES)}>
            {say("canvassing_guidelines")}</Text>. {say("be_courteous_to_those")}
          </Text>
        </View>

        <Divider />

        <View style={{margin: 12}}>
          <PatreonButton text="While this app is free to use, it is not free to create & maintain! Become a patron to help ensure continued development work." />
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

            {myOrgID === null &&
            <View>
              <Button block bordered dark onPress={() => {
                const { state } = this.state;

                if (!this.checkLocationAccess()) return;
                if (!state) {
                  this.setState({canvaslater: 451});
                  return this.alert(say("out_of_bounds"), say("not_located_within_us_bounds"));
                }

                this.setState({SelectModeScreen: false, newOrg: true, state})}
              }>
                <Icon name="clipboard" {...iconStyles} />
                <Text>{say("org_id_signup")}</Text>
              </Button>
              <Text style={{fontSize: 12, marginBottom: 10, textAlign: 'justify'}}>{say("org_id_signup_subtext")}</Text>
            </View>
            }

            {(__DEV__&&dinfo.Emulator)&&
            <View>
              <Button block bordered dark onPress={() => {
                this.setState({SelectModeScreen: false});
                this.connectToServer(localaddress()+':8080')}
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
          title={(connectmode?"Connecting":"Getting Things Ready")}
          visible={(connectmode||waitmode)}>
          <View style={{alignItems: 'center'}}>
            <Progress.Circle
              progress={(waitprogress/PROCESS_MAX_WAIT)}
              color={(connectmode?"blue":"red")}
              showsText={true}
              size={180}
              thickness={4}
              indeterminate={((connectmode||waitprogress>=PROCESS_MAX_WAIT)?true:false)}
              borderWidth={4} />
              {(waitmode)&&<PatreonButton text="Avoid app startup times! Become a patron for faster entry into canvassing." />}
            <KeepAwake />
          </View>
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

        <HVConfirmDialog refer={this} />

      </Content>
    );
  }

}

const ServerList = props => {
  const { refer } = props;
  const { jwt, myOrgID, servers } = refer.state;

  return servers.map((s,idx) => (
    <ListItem avatar key={idx} style={{padding: 10}}>
      <Left>
        <Icon name={(s.orgId?"id-badge":"cloud-upload")} size={25} color="black" />
      </Left>
      <Body>
        {(s.forms&&s.forms.length===1)&&
          <Text>{s.forms[0].name}</Text>
        }
        <Text>{(s.orgId?say("org_id")+": "+s.orgId:"Server: "+s.server)}</Text>
      </Body>
      <Right>
        <Button onPress={() => refer.sayHello(s.server, s.orgId)}>
          <Text>Enter Map</Text>
        </Button>
      </Right>
    </ListItem>
  ));
};

const NotRightNow = props => (
  <View>
    <Image source={props.image} style={{
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height*.8,
      resizeMode: 'stretch',
    }} />
    <View style={{position: 'absolute', left: 0, top: 0, alignItems: 'center'}}>
      <H1 style={{margin: 5, alignSelf: 'center'}}>{props.title}{(__DEV__?" ("+props.refer.state.canvaslater+")":"")}</H1>
      <Text style={{padding: 10}}>{props.message}</Text>
      {props.youtube&&
      <Content>
        <ListItem avatar onPress={() => openURL('https://www.youtube.com/channel/UCw5fpnK-IZVQ4IkYuapIbiw')}>
          <Left>
            <Icon name="youtube-play" size={40} color="#ff0000" style={{marginRight: 25}} />
          </Left>
          <Right>
            <Text>Want to show the app to someone? Check out our Youtube channel.</Text>
          </Right>
        </ListItem>
      </Content>
      }
      {props.patreon&&<PatreonButton />}
      <HVConfirmDialog refer={props.refer} />
    </View>
  </View>
);

const iconStyles = {
  borderRadius: 10,
  paddingLeft: 25,
  padding: 10,
  size: 25,
};
