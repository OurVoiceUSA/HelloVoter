import jwt_decode from 'jwt-decode';
import SafariView from 'react-native-safari-view';
import RNGooglePlaces from 'react-native-google-places';
import Geocoder from 'react-native-geocoder-reborn';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { wsbase } from './config';

var reA = /[^a-zA-Z]/g;
var reN = /[^0-9]/g;

export function sortAlphaNum(ao, bo) {
  let a = ao.name;
  let b = bo.name;

  let aA = a.replace(reA, "");
  let bA = b.replace(reA, "");
  if (aA === bA) {
    let aN = parseInt(a.replace(reN, ""), 10);
    let bN = parseInt(b.replace(reN, ""), 10);
    return aN === bN ? 0 : aN > bN ? 1 : -1;
  } else {
    return aA > bA ? 1 : -1;
  }
}

export const bbox_usa = {"type":"MultiPolygon","coordinates":[[[[-179,14],[-50,14],[-50,71],[-179,71],[-179,14]]]]};

TimeAgo.addLocale(en);
export function timeAgo(val) {
  return new TimeAgo('en-US').format(val);
}

export function invite2obj(url) {
  let obj = {};
  try {
    // Why oh why is the "new URL()" object not implemented in RN?!? gah
    // brings me back to my perl days with ugly one liners. Ahh, the nostalgia! convert URI key/values to object
    url.split('?')[1].split('&').forEach(p => {
      const [p1,p2] = p.split('=');
      obj[p1] = p2;
    });
  } catch (e) {}
  return obj;
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

export function verify_aud(server, obj) {
  // verify issuer
  if (obj.iss !== 'ourvoiceusa.org') return false;
  // verify audiance
  if (obj.aud === server) return true;
  // gotv audiance catchall
  if (obj.aud === 'gotv.ourvoiceusa.org' && server.match(/^gotv.*\.ourvoiceusa\.org$/)) return true;
  // local dev
  if (server === localaddress()+':8080') return true;
  // not a valid jwt for the given audiance
  return false;
}

export async function _apiCall(uri, input) {
  var res;
  var retry = false;

  do {
    res = await fetch(wsbase+uri, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer '+await _getApiToken(),
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

export async function _saveUser(user) {
  try {
    await storage.set(STORAGE_KEY_USERLOCAL, JSON.stringify(user));
  } catch (error) {
    console.warn(error);
  }
}

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
    try {
      let res = await fetch(wsbase+'/orgid/v1/ping', {
        headers: {
          'Authorization': 'Bearer '+jwt,
          'Content-Type': 'application/json',
          'User-Agent': await _UserAgent(),
        },
      });
      if (res.status != 200) {
        _rmJWT();
        jwt = null;
      }
    } catch (error) {
      console.warn(error);
    }

    user.profile = {};
    if (localuser) {
      // copy local objects
      user.lastsearchpos = localuser.lastsearchpos;
      user.dropbox = localuser.dropbox;
      // merge localuser with user where user profile item is null
      if (localuser.profile) {
        if (!user.profile.home_address && localuser.profile.home_address) user.profile.home_address = localuser.profile.home_address;
        if (!user.profile.home_lng && localuser.profile.home_lng) user.profile.home_lng = localuser.profile.home_lng;
        if (!user.profile.home_lat && localuser.profile.home_lat) user.profile.home_lat = localuser.profile.home_lat;
      }
    }
    user.lastsmlogin = Math.floor(new Date().getTime());
    user.loggedin = true;
    _saveUser(user);
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
    await storage.del(STORAGE_KEY_SETTINGS);
    await storage.del(STORAGE_KEY_SERVERS);
    try {
      let forms = JSON.parse(await storage.get(STORAGE_KEY_OLDFORMS));
    } catch (error) {}
    await storage.del(STORAGE_KEY_OLDFORMS);
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

export const PersonAttr = ({form, attrs, idx}) => {
  // skip certain attributes
  let fattrs = form.attributes.filter(a => {
    switch (a.type) {
      case 'hyperlink':
      case 'note':
        return false;
    }
    return true;
  })
  if (fattrs[idx]) {
    let id = fattrs[idx].id;
    let name = fattrs[idx].name;
    let attr = (attrs.filter(a => a.id === id))[0];
    if (attr) {
      let value = attr.value;
      if (fattrs[idx].type === 'boolean') {
        if (value) value = "Yes";
        else value = "No";
      }
      if (name && name.length > 35) name = name.substr(0, 35)+'...';
      if (value && value.length > 35) value = value.substr(0, 35)+'...';
      return (
        <Text>
          {name}: {value}
        </Text>
      );
    }
  }
  return null;
};
