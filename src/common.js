
import storage from 'react-native-storage-wrapper';
import jwt_decode from 'jwt-decode';
import DeviceInfo from 'react-native-device-info';
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

export async function _apiCall(uri, input) {
  var res;
  var jwt = await storage.get(JWT);

  if (!jwt) {
    res = await fetch(wsbase+uri, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(input)}
    );
    return res;
  }

  // add device id to input
  input.deviceId = DeviceInfo.getUniqueID;

  res = await fetch(wsbase+uri, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer '+jwt,
      'Content-Type': 'application/json',
//      'Accept-encoding': 'gzip',
    },
    body: JSON.stringify(input),
  });
  return res;
}

export async function _saveUser(user, remote) {

  try {
    if (remote) {
      if(user.loggedin) {
        _apiCall('/api/protected/dprofile', {
          party: user.profile.party,
          address: user.profile.home_address,
          lng: user.profile.home_lng,
          lat: user.profile.home_lat,
        });
      } else {
        if (!user.lastsmlogin) {
          _apiCall('/api/dprofile', {
            party: user.profile.party,
            address: user.profile.home_address,
            lng: user.profile.home_lng,
            lat: user.profile.home_lat,
          });
        }
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
  var dinfo_resp = null;
  var localuser = await _getUserLocal();

  // just use locally cached data
  if (!remote) {
    if (localuser == null) localuser = { profile: {} };
    return localuser;
  }

  try {
    jwt = await storage.get(JWT);
    if (jwt !== null) {
      // bounce the token off the API to see if it's still valid
      let res = await fetch(wsbase+'/api/protected/dinfo', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+jwt,
          'Content-Type': 'application/json',
//          'Accept-encoding': 'gzip',
        },
        body: JSON.stringify(dinfo),
      });
      if (res.status == 401) {
        _rmJWT();
        jwt = null;
      } else {
        dinfo_resp = JSON.parse(res._bodyInit);
      }
    }
  } catch (error) {
    console.warn(error);
  }

  if (jwt !== null) {
    user = jwt_decode(jwt);
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
    user.lastsmlogin = Math.floor(new Date().getTime() / 1000);
    user.loggedin = true;
    _saveJWT(jwt);
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
    await storage.del('OV_SURVEY@0');
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

