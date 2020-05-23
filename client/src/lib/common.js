import React from 'react';
import { Platform, Linking, View, Text } from './react-native';
import pip from 'point-in-polygon';
import mobile from 'is-mobile';
import RBush from 'rbush';

import { geographies } from './geographies';
import { STORAGE_KEY_JWT } from './consts';
import { SafariView } from './SafariView';
import * as storage from './storage';
import rtree from './rtree.json';

export function localaddress() {
  return (Platform.OS === 'android'?'10.0.2.2':'localhost');
}

export function isOnlyWeb() {
  if (Platform.OS === 'web' && !mobile(window.navigator.userAgent)) return true;
  return false;
}

export function isOnlyNative() {
  if (Platform.OS !== 'web') return true;
  return false;
}

export async function openURL(url, external) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
    return true;
  }
  try {
    // Use SafariView in-line to the app on iOS if it's an http URL
    if (url.match(/^http/) && Platform.OS === 'ios' && !external) {
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
  }
  return false;
}

export function openGitHub(repo) {
  openURL('https://github.com/OurVoiceUSA/'+(repo?repo:''));
}

export function openDonate() {
  try {
    Linking.openURL('https://www.patreon.com/join/hellovoter');
  } catch (e) {
    console.warn(e);
  }
}

export async function _getApiToken() {
  let jwt = await storage.get(STORAGE_KEY_JWT);
  if (!jwt) return "of the one ring";
  return jwt;
}

export function api_base_uri(orgId) {
  return '/'+(orgId?orgId+'/':'')+'api/v1';
}

export function getEpoch() {
  return Math.floor(new Date().getTime())
}

export function ingeojson(json, lng, lat) {
  switch (json.type) {
    case "Polygon":
      if (pip([lng, lat], json.coordinates[0])) {
        return true;
      }
      return false;
    case "MultiPolygon":
      for (let p in json.coordinates) {
        if (pip([lng, lat], json.coordinates[p][0])) {
          return true;
        }
      }
      return false;
    default: return false;
  }
}

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

export const makeTooltipContent = (text) => (
  <View style={{paddingHorizontal: 24, paddingVertical: 8}}>
    <Text>{text}</Text>
  </View>
);

export var sleep = m => new Promise(r => setTimeout(r, m));
