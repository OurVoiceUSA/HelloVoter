/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react';
import { Platform, Text } from '../lib/react-native';

import { Root, Content, ViewCenter, Space } from '../components/Layout';
import { localaddress, openURL } from '../lib/common';
import { URL_PRIVACY_POLICY } from '../lib/consts';
import { Button } from '../components/Buttons';
import { Heading } from '../components/Type';

export const LoginScreen = ({ refer }) => (
  <Root>
    <Content>
      <Heading>Welcome to Hello Voter!</Heading>
      <ViewCenter>
        <Button
          title="Log in with Facebook"
          onPress={() => login(refer, "fm")}
        />
        <Button
          title="Log in with Google"
          onPress={() => login(refer, "gm")}
          alt={true}
        />

{/*
        <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
          <Icon name="facebook-official" size={40} color="#3b5998" style={{marginRight: 25}} onPress={() => openURL('https://m.facebook.com/OurVoiceUsa')} />
          <Icon name="twitter" size={40} color="#0084b4" style={{marginRight: 25}} onPress={() => openURL('https://twitter.com/OurVoiceUsa')} />
          <Icon name="youtube-play" size={40} color="#ff0000" style={{marginRight: 25}} onPress={() => openURL('https://www.youtube.com/channel/UCw5fpnK-IZVQ4IkYuapIbiw')} />
          <Icon name="github" size={40} style={{marginRight: 25}} onPress={() => openGitHub()} />
          <Icon name="globe" size={40} color="#008080" onPress={() => openURL('https://ourvoiceusa.org/')} />
        </View>
*/}
        <Space />
        <Text>
          We value your privacy! Read our <Text note style={{fontWeight: 'bold', color: 'blue'}} onPress={() => openURL(URL_PRIVACY_POLICY)}>privacy policy</Text> for details.
        </Text>
        <Space />
        <Text>Built with ❤️ by Our Voice USA</Text>
        <Space />
        <Text>Not for any candidate or political party.</Text>
        <Space />
        <Text>Copyright (c) 2020, Our Voice USA. All rights reserved.</Text>
        <Space />
        <Text style={{width: 350}}>
          This program is free software; you can redistribute it and/or
          modify it under the terms of the GNU Affero General Public License
          as published by the Free Software Foundation; either version 3
          of the License, or (at your option) any later version.
        </Text>
      </ViewCenter>
    </Content>
  </Root>
);

async function login (refer, sm) {
  let ret = false;
  let orgId
  let token
  let server = process.env.NODE_ENV === 'development' ? localaddress()+':8080' : 'gotv.ourvoiceusa.org';

  refer.setState({loading: true});

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
