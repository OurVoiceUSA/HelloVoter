
import React, { PureComponent } from 'react';

import {
  Dimensions,
  Platform,
  View,
} from 'react-native';

import storage from 'react-native-storage-wrapper';
import { getLocales, getTimeZone } from 'react-native-localize';
import jwt_decode from 'jwt-decode';
import DeviceInfo from 'react-native-device-info';
import Permissions from 'react-native-permissions';
import RNGooglePlaces from 'react-native-google-places';
import Geocoder from 'react-native-geocoder-reborn';
import memoize from 'lodash.memoize';
import i18n from 'i18n-js';
import { wsbase } from './config';

const JWT = 'OV_JWT';
const USERLOCAL = 'OV_USER';

export const say = memoize(
  (key, config) => i18n.t(key, config),
  (key, config) => (config ? key + JSON.stringify(config) : key)
);

export function getEpoch() {
  return Math.floor(new Date().getTime())
}

export function api_base_uri(orgId) {
  return '/HelloVoterHQ/'+(orgId?orgId+'/':'')+'api/v1';
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
  var jwt = await storage.get(JWT);

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
    await storage.set(USERLOCAL, JSON.stringify(user));
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
  var localuser = await _getUserLocal();

  // just use locally cached data
  if (!remote) {
    if (localuser == null) localuser = { profile: {} };
    return localuser;
  }

  let jwt = null;
  try {
    jwt = await storage.get(JWT);
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
    user = await _getUserLocal();
  }

  if (user == null) user = { profile: {} };

  return user;
}

export async function _saveJWT(jwt) {
  try {
    await storage.set(JWT, jwt);
  } catch (error) {
    console.warn(error);
  }
}

export async function _getUserLocal() {
  let user = null;
  try {
    let str = await storage.get(USERLOCAL);
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
    await storage.del(USERLOCAL);
    await storage.del('OV_DISCLOUSER');
    await storage.del('OV_CANVASS_SETTINGS');
    try {
      let forms = JSON.parse(await storage.get('OV_CANVASS_FORMS'));
      for (let i in forms) {
        await storage.del('OV_CANVASS_PINS@'+forms[i].id);
      }
    } catch (error) {}
    await storage.del('OV_CANVASS_PINS@sampleForm');
    await storage.del('OV_CANVASS_FORMS');
  } catch (error) {
    console.warn(error);
  }
}

export async function _rmJWT() {
  try {
    await storage.del(JWT);
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
