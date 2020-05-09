import { Platform, Linking } from "react-native";

import { SafariView } from './routing';

export function localaddress() {
  return (Platform.OS === 'android'?'10.0.2.2':'localhost');
}

export async function openURL(url, external) {
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
