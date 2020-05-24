/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react';
import { Platform } from '../lib/react-native';

import { Root, Content, ViewCenter } from '../components/Layout';
import { localaddress, openURL } from '../lib/common';
import { Button } from '../components/Buttons';
import { Heading } from '../components/Type';
import AboutOV from '../components/AboutOV';

export const LoginScreen = ({ refer }) => (
  <Root>
    <Content>
      <Heading>Welcome to Hello Voter!</Heading>
      <ViewCenter>
        <Button
          title="Log in with Facebook"
          onPress={login.bind(refer, "fm")}
        />
        <Button
          title="Log in with Google"
          onPress={login.bind(refer, "gm")}
          alt={true}
        />
        <AboutOV refer={refer} />
      </ViewCenter>
    </Content>
  </Root>
);

export async function login (sm) {
  let ret = false;
  let orgId
  let token
  let server = process.env.NODE_ENV === 'development' ? localaddress()+':8080' : 'gotv.ourvoiceusa.org';

  this.setState({loading: true});

  let https = true;
  if (server.match(/:8080$/)) https = false;

  try {
    let res = await fetch('http'+(https?'s':'')+'://' + server + '/'+(orgId?orgId+'/':'')+'api/v1/hello', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + (token ? token : 'of the one ring'),
        'Content-Type': 'application/json'
      },
    });

    let sm_oauth_url = res.headers.get('x-sm-oauth-url');

    if (!sm_oauth_url) throw new Error("Missing required header.");

    switch (res.status) {
    case 200: ret = true; break;
    case 400: break; // TODO: rm jwt?
    case 401:
      if (Platform.OS === 'web') {
        window.location.href = sm_oauth_url + '/'+sm+'/?app=hellovoter'+(https?'':'&local=true');
      } else {
        openURL(sm_oauth_url+'/'+sm)
      }
      break;
    default: break;
    }
  } catch (e) {
  }

  return ret;
}
