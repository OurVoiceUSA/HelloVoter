
import storage from 'react-native-storage-wrapper';
import jwt_decode from 'jwt-decode';
import DeviceInfo from 'react-native-device-info';
import RNGooglePlaces from 'react-native-google-places';
import Geocoder from 'react-native-geocoder';
import { wsbase } from './config';

const JWT = 'OV_JWT';
const USERLOCAL = 'OV_USER';

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
    case 'D': return 'Democrat';
    case 'R': return 'Republican';
    case 'I': return 'Independent';
    case 'G': return 'Green';
    case 'L': return 'Libertarian';
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

function _UserAgent() {
  return 'OurVoiceApp/'+DeviceInfo.getVersion()+
    ' ('+DeviceInfo.getManufacturer()+' '+DeviceInfo.getModel()+'; '+
    DeviceInfo.getSystemName()+' '+DeviceInfo.getSystemVersion()+')';
}

export async function _getApiToken() {
  var jwt = await storage.get(JWT);

  if (!jwt) {
    res = await fetch(wsbase+'/auth/jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': _UserAgent(),
      },
      body: JSON.stringify({apiKey: DeviceInfo.getUniqueID()})
    });
    jwt = JSON.parse(res._bodyInit).jwt;
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
        'User-Agent': _UserAgent(),
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

export async function _getJWT(remote) {

  // assemble device info
  const dinfo = {
    UniqueID: DeviceInfo.getUniqueID(),
    Manufacturer: DeviceInfo.getManufacturer(),
    Brand: DeviceInfo.getBrand(),
    Model: DeviceInfo.getModel(),
    DeviceId: DeviceInfo.getDeviceId(),
    SystemName: DeviceInfo.getSystemName(),
    SystemVersion: DeviceInfo.getSystemVersion(),
    BundleId: DeviceInfo.getBundleId(),
    BuildNumber: DeviceInfo.getBuildNumber(),
    Version: DeviceInfo.getVersion(),
    ReadableVersion: DeviceInfo.getReadableVersion(),
    DeviceName: DeviceInfo.getDeviceName(),
    UserAgent: DeviceInfo.getUserAgent(),
    DeviceLocale: DeviceInfo.getDeviceLocale(),
    Country: DeviceInfo.getDeviceCountry(),
    Timezone: DeviceInfo.getTimezone(),
    Emulator: DeviceInfo.isEmulator(),
    Tablet: DeviceInfo.isTablet(),
  };

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
          'User-Agent': _UserAgent(),
        },
        body: JSON.stringify(dinfo),
      });
      if (res.status != 200) {
        _rmJWT();
        jwt = null;
      } else {
        dinfo_resp = JSON.parse(res._bodyInit);
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
    user.lastsmlogin = Math.floor(new Date().getTime() / 1000);
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
