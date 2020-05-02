import React from "react";
import { Platform, Text } from "react-native";
import { Root, Content } from "../components/Layout";
import { Button } from "../components/Buttons";
import * as WebBrowser from 'expo-web-browser';

export const LoginScreen = ({ navigation }) => {
  return (
    <Root>
      <Content>
        <Text>Welcome to Hello Voter</Text>
        <Button
          onPress={() => login("google")}
          title="Log in with Google"
        />
        <Button
          onPress={() => navigation.navigate("Dashboard")}
          title="Dashboard (skip login)"
        />
      </Content>
    </Root>
  );
};

let state = {}

async function login (target) {
  let res
  let orgId
  let token
  let server

  if (Platform.OS === 'web') {
    server = 'localhost:8080' // just testing
  } else {
    server = 'gotv-vt.ourvoiceusa.org' // just testing
  }

  let https = true;
  if (server.match(/:8080$/)) https = false;

  try {
    let retry = true;

    while (retry) {
      res = await fetch('http'+(https?'s':'')+'://' + server + '/HelloVoterHQ/'+(orgId?orgId+'/':'')+'api/v1/hello', {
        method: 'POST',
        headers: {
          Authorization:
            'Bearer ' +
            (token ? token : (state.token ? state.token : 'of the one ring')),
          'Content-Type': 'application/json'
        },
      });

      retry = false;
    }

    let sm_oauth_url = res.headers.get('x-sm-oauth-url');

    if (!sm_oauth_url)
      return { error: true, msg: 'Missing required header.' };

    switch (res.status) {
    case 200:
      break; // valid - break to proceed
    case 400:
      return {
        error: true,
        msg:
            'The server didn\'t understand the request sent from this device.'
      };
    case 401:
      let sm = '';
      if (target === 'google') sm = 'gm';
      if (target === 'facebook') sm = 'fm';

      if (Platform.OS === 'web') {
        window.location.href = sm_oauth_url + '/'+sm+'/?app=HelloVoterHQ'+(https?'':'&local=true');
      } else {
        WebBrowser.openBrowserAsync(sm_oauth_url + '/' + sm)
      }

      return { error: false, flag: true };
    case 403:
      return {
        error: true,
        msg:
            'We\'re sorry, but your request to volunteer with this server has been rejected.'
      };
    default:
      return { error: true, msg: 'Unknown error connecting to server.' };
    }

    let body = await res.json();

    if (body.data.ready !== true) {

      alert('the server said: ', body.msg)
      return { error: false, msg: 'The server said: ' + body.msg, data: body.data };
    } else {
      // TODO: use form data from body.data.forms[0] and save it in the forms_local cache
      // TODO: if there's more than one form in body.data.forms - don't navigate
      alert({ user: this.state.user });
      return { error: false, flag: true, data: body.data };
    }
  } catch (e) {
    return {
      error: true,
      msg: 'Unable to make a connection to target server'
    };
  }
}
