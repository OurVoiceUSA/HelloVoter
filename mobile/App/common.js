import React, { PureComponent } from 'react';

import {
  Dimensions,
  Linking,
  Platform,
  View,
} from 'react-native';

import { Text } from 'native-base';

import storage from 'react-native-storage-wrapper';
import { getLocales, getTimeZone } from 'react-native-localize';
import { ingeojson } from 'ourvoiceusa-sdk-js';
import jwt_decode from 'jwt-decode';
import SafariView from 'react-native-safari-view';
import DeviceInfo from 'react-native-device-info';
import Permissions from 'react-native-permissions';
import RNGooglePlaces from 'react-native-google-places';
import Geocoder from 'react-native-geocoder-reborn';
import memoize from 'lodash.memoize';
import i18n from 'i18n-js';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { wsbase } from './config';

import RBush from 'rbush';
import rtree from '../rtree.json';
import { geographies } from './geographies';

export const STORAGE_KEY_JWT = 'OV_JWT';
export const STORAGE_KEY_USERLOCAL = 'OV_USER';
export const STORAGE_KEY_DISCLOSURE = 'OV_TERMS_2019_11_20';
export const STORAGE_KEY_SETTINGS = 'OV_CANVASS_SETTINGS';
export const URL_TERMS_OF_SERVICE = 'https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/master/docs/Terms-of-Service.md';
export const URL_PRIVACY_POLICY = 'https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/master/docs/Privacy-Policy.md';
export const URL_GUIDELINES = 'https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/master/docs/Canvassing-Guidelines.md';
export const URL_HELP = 'https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/master/docs/Canvassing.md';

export const say = memoize(
  (key, config) => i18n.t(key, config),
  (key, config) => (config ? key + JSON.stringify(config) : key)
);

export const bbox_usa = {"type":"MultiPolygon","coordinates":[[[[-179,14],[-50,14],[-50,71],[-179,71],[-179,14]]]]};

export function localaddress() {
  return (Platform.OS === 'ios'?'localhost':'10.0.2.2');
}

export function getEpoch() {
  return Math.floor(new Date().getTime())
}

TimeAgo.addLocale(en);
export function timeAgo(val) {
  return new TimeAgo('en-US').format(val);
}

export function api_base_uri(orgId) {
  return '/HelloVoterHQ/'+(orgId?orgId+'/':'')+'api/v1';
}

export async function createOrgID(data) {
  return fetch('https://gotv-'+data.state+'.ourvoiceusa.org/orgid/v1/new', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Authorization': 'Bearer '+await _getApiToken(),
      'Content-Type': 'application/json',
    },
  });
}

export function _logout() {
  _rmJWT();
  _rmUser();
}

export async function openURL(url) {
  try {
    // Use SafariView in-line to the app on iOS if it's an http URL
    if (url.match(/^http/) && Platform.OS === 'ios') {
      SafariView.show({
        url: url,
        fromBottom: true,
      });
    } else {
      await Linking.openURL(url);
    }
    return true;
  } catch (e) {
    console.warn(e);
    // TODO
    // refer.alert(say("app_error"), say("unable_to_launch_external"));
  }
  return false;
}

export function openGitHub(repo) {
  openURL('https://github.com/OurVoiceUSA/'+(repo?repo:''));
}

export function openDonate() {
  openURL('https://www.patreon.com/join/hellovoter');
}

export function getPropFromArrObj(arr, id, prop) {
  for (let i in arr)
    if (arr[i].id === id) return arr[i][prop];
  return false;
}

export async function permissionNotify() {
  try {
    let res = await Permissions.checkNotifications();
    if (res.status === "denied") res = await Permissions.requestNotifications(['alert', 'badge', 'sound']);
    if (res.status === "granted") return true;
  } catch(error) {
    // nothing we can do about it
  }
  return false;
}

export async function permissionLocation() {
  let perm;

  if (Platform.OS === 'ios') {
    perm = Permissions.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
  } else {
    perm = Permissions.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  }

  try {
    let res = await Permissions.check(perm);
    if (res === "denied") res = await Permissions.request(perm);
    if (res === "granted") return true;
  } catch (e) {
    console.warn(e);
  }

  return false;
}

export async function _loginPing(refer, remote) {
  let user = await _getJWT(remote);
  if (user !== null)
      refer.setState({user: user});
  return user;
}

export function _specificAddress(address) {
  if ((address.match(/,/g) || []).length <= 2) return false;
  return true;
}

export function _partyNameFromKey(party) {
  switch (party) {
    case 'D': return say("democrat");
    case 'R': return say("republican");
    case 'I': return say("independent");
    case 'G': return say("green");
    case 'L': return say("libertarian");
    default: return '';
  }
}

function getLastVisitObj(place) {
  let latest = {status:-1,end:0};

  if (!place.visits || place.visits.length === 0)
    return latest;

  for (let i in place.visits) {
    if (place.visits[i].status !== 3 && place.visits[i].end > latest.end) latest = place.visits[i];
  }

  return latest;
}

export function getLastVisit(place) {
  let str;
  let v = getLastVisitObj(place);

  switch (v.status) {
    case 0: str = "Not home"; break;
    case 1: str = "Home"; break;
    case 2: str = "Not interested"; break;
    default: str = "Haven't visited"; break;
  }

  return str+(v.end?" "+timeAgo(v.end):'');
}

export function getPinColor(place) {
  if (place.units && place.units.length) return "cyan";

  let str;
  let v = getLastVisitObj(place);

  switch (v.status) {
    case 0: return 'yellow';
    case 1: return 'green';
    case 2: return 'red';
    default: return '#8b4513';
  }
}

export async function _doGeocode(lng, lat) {
  let position = {
    longitude: lng,
    latitude: lat,
    icon: 'map-marker',
  };

  try {
    let results = await Geocoder.geocodePosition({lng: lng, lat: lat});
    position.address = results[0].formattedAddress.replace(/\u2013\d+/, "").replace(/\-\d+/, "");
  } catch (error) {}

  // fall back to GooglePlaces
  if (!position.address) {
    try {
      let results = await RNGooglePlaces.getCurrentPlace();
      // the "place" object has other stuff we don't want - just get what we need
      position.longitude = results[0].longitude;
      position.latitude = results[0].latitude;
      position.address = results[0].address;
    } catch (error) {
      // can't geocode, set the address as an error
      position.address = 'location address error';
      position.error = true;
    }
  }

  if (position.address)
    position.address = position.address.replace(/\s\s+/g, ' ');

  return position;
}

async function _UserAgent() {
  let info = await DINFO();
  return 'OurVoiceApp/'+info.Version+
    ' ('+info.Manufacturer+' '+info.Model+'; '+
    info.SystemName+' '+info.SystemVersion+')';
}

export async function _getApiToken() {
  var jwt = await storage.get(STORAGE_KEY_JWT);

  if (!jwt) {
    res = await fetch(wsbase+'/auth/jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': await _UserAgent(),
      },
      body: JSON.stringify({apiKey: await DeviceInfo.getUniqueId()})
    });
    jwt = JSON.parse(await res.text()).jwt;
    _saveJWT(jwt);
  }
  return jwt;
}

export async function _apiCall(uri, input) {
  var res;
  var jwt;
  var retry = false;

  do {
    jwt = await _getApiToken();

    res = await fetch(wsbase+uri, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer '+jwt,
        'Content-Type': 'application/json',
        'User-Agent': await _UserAgent(),
      },
      body: JSON.stringify(input),
    });

    if (res.status != 200) {
      if (retry) break; // don't retry again
      await _rmJWT();
      retry = true;
    } else {
      retry = false;
    }

  } while (retry);

  return res;
}

export async function _saveUser(user, remote) {
  try {
    if (remote) {
      if(user.loggedin) {
        _apiCall('/api/v1/dprofile', {
          party: user.profile.party,
          address: user.profile.home_address,
          lng: user.profile.home_lng,
          lat: user.profile.home_lat,
        });
      }
    }
  } catch (error) {
    console.warn(error);
  }

  try {
    await storage.set(STORAGE_KEY_USERLOCAL, JSON.stringify(user));
  } catch (error) {
    console.warn(error);
  }
}

// assemble device info
export async function DINFO() {
  let locale;
  let info = {};

  try {
    let [
      ApplicationName, Brand, BuildNumber, BundleId, Carrier, DeviceId,
      DeviceName, FontScale, FreeDiskStorage, Manufacturer, Model,
      ReadableVersion, SystemName, SystemVersion, TotalDiskCapacity,
      TotalMemory, UniqueID, UserAgent, Version, Emulator, Tablet,
      hasNotch, Landscape
    ] = await Promise.all([
      DeviceInfo.getApplicationName(),
      DeviceInfo.getBrand(),
      DeviceInfo.getBuildNumber(),
      DeviceInfo.getBundleId(),
      DeviceInfo.getCarrier(),
      DeviceInfo.getDeviceId(),
      DeviceInfo.getDeviceName(),
      DeviceInfo.getFontScale(),
      DeviceInfo.getFreeDiskStorage(),
      DeviceInfo.getManufacturer(),
      DeviceInfo.getModel(),
      DeviceInfo.getReadableVersion(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getTotalDiskCapacity(),
      DeviceInfo.getTotalMemory(),
      DeviceInfo.getUniqueId(),
      DeviceInfo.getUserAgent(),
      DeviceInfo.getVersion(),
      DeviceInfo.isEmulator(),
      DeviceInfo.isTablet(),
      DeviceInfo.hasNotch(),
      DeviceInfo.isLandscape(),
    ]);

    info.ApplicationName = ApplicationName;
    info.Brand = Brand;
    info.BuildNumber = BuildNumber;
    info.BundleId = BundleId;
    info.Carrier = Carrier;
    info.DeviceId = DeviceId;
    info.DeviceName = DeviceName;
    info.FontScale = FontScale;
    info.FreeDiskStorage = FreeDiskStorage;
    info.Manufacturer = Manufacturer;
    info.Model = Model;
    info.ReadableVersion = ReadableVersion;
    info.SystemName = SystemName;
    info.SystemVersion = SystemVersion;
    info.TotalDiskCapacity = TotalDiskCapacity;
    info.TotalMemory = TotalMemory;
    info.UniqueID = UniqueID;
    info.UserAgent = UserAgent;
    info.Version = Version;
    info.Emulator = Emulator;
    info.Tablet = Tablet;
    info.hasNotch = hasNotch;
    info.Landscape = Landscape;
  } catch (e) {
    console.warn("DeviceInfo:"+e);
  }

  // DeviceInfo used to have these ... no more. Get them from another module
  try {
    locale = getLocales()[0];
    info.Timezone = getTimeZone();
  } catch (e) {
    locale = {};
    console.warn(e);
  };

  info.DeviceCountry = locale.countryCode;
  info.DeviceLocale = locale.languageCode;

  return info;
};

export async function _getJWT(remote) {

  let user = null;
  var localuser = await _get_userlocal();

  // just use locally cached data
  if (!remote) {
    if (localuser == null) localuser = { profile: {} };
    return localuser;
  }

  let jwt = null;
  try {
    jwt = await storage.get(STORAGE_KEY_JWT);
  } catch (error) {
    console.warn(error);
  }

  if (jwt !== null)
    user = jwt_decode(jwt);

  // if it's a user JWT, bounce the token off the API to see if it's still valid
  if (user && user.id) {
    let dinfo_resp = null;
    try {
      let res = await fetch(wsbase+'/api/v1/dinfo', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+jwt,
          'Content-Type': 'application/json',
          'User-Agent': await _UserAgent(),
        },
        body: JSON.stringify(DINFO),
      });
      if (res.status != 200) {
        _rmJWT();
        jwt = null;
      } else {
        dinfo_resp = await res.json();
      }
    } catch (error) {
      console.warn(error);
    }

    user.profile = (dinfo_resp?dinfo_resp:{});
    if (localuser) {
      // copy local objects
      user.lastsearchpos = localuser.lastsearchpos;
      user.dropbox = localuser.dropbox;
      // merge localuser with user where user profile item is null
      if (localuser.profile) {
        if (!user.profile.party && localuser.profile.party) { user.profile.party = localuser.profile.party; remote = true; }
        if (!user.profile.home_address && localuser.profile.home_address) { user.profile.home_address = localuser.profile.home_address; remote = true; }
        if (!user.profile.home_lng && localuser.profile.home_lng) { user.profile.home_lng = localuser.profile.home_lng; remote = true; }
        if (!user.profile.home_lat && localuser.profile.home_lat) { user.profile.home_lat = localuser.profile.home_lat; remote = true; }
      }
    }
    user.lastsmlogin = Math.floor(new Date().getTime());
    user.loggedin = true;
    _saveUser(user, remote);
  } else {
    user = await _get_userlocal();
  }

  if (user == null) user = { profile: {} };

  return user;
}

export async function _saveJWT(jwt) {
  try {
    await storage.set(STORAGE_KEY_JWT, jwt);
  } catch (error) {
    console.warn(error);
  }
}

export async function _get_userlocal() {
  let user = null;
  try {
    let str = await storage.get(STORAGE_KEY_USERLOCAL);
    if (str) {
      user = JSON.parse(str);
      user.loggedin = false;
    }
  } catch (error) {
    console.warn(error);
  }
  return user;
}

export async function _rmUser() {
  try {
    await storage.del(STORAGE_KEY_USERLOCAL);
    await storage.del(STORAGE_KEY_DISCLOSURE);
    await storage.del('OV_CANVASS_SETTINGS');
    try {
      let forms = JSON.parse(await storage.get('OV_CANVASS_FORMS'));
    } catch (error) {}
    await storage.del('OV_CANVASS_FORMS');
  } catch (error) {
    console.warn(error);
  }
}

export async function _rmJWT() {
  try {
    await storage.del(STORAGE_KEY_JWT);
  } catch (error) {
    console.warn(error);
  }
}

export const Divider = props => (
  <View style={{
      width: Dimensions.get('window').width,
      height: 1,
      backgroundColor: 'lightgray'
    }}
  />
);

export const PersonAttr = props => {
  if (props.form.attributes[props.idx]) {
    let id = props.form.attributes[props.idx].id;
    let name = props.form.attributes[props.idx].name;
    let attr = (props.attrs.filter(a => a.id === id))[0];
    if (attr) {
      let value = attr.value;
      if (props.form.attributes[props.idx].type === 'boolean') {
        if (value) value = "Yes";
        else value = "No";
      }
      return (
        <Text>
          {name}: {value}
        </Text>
      );
    }
  }
  return null;
};

export function getUSState(myPosition) {
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
      state = bb.state.toUpperCase();
  });
  return state;
}
