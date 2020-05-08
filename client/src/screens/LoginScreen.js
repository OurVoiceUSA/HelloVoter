import React from "react";
import { Platform, Text, Linking } from "react-native";

import { Root, Content, ViewCenter, Space } from "../components/Layout";
import { Button } from "../components/Buttons";
import { Heading } from "../components/Type";
import { SafariView } from '../App/routing';
import * as storage from '../lib/storage';

export const LoginScreen = ({ refer }) => {
  const { user } = refer.state;

  return (
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
};

let state = {}

async function login (refer, sm) {
  let ret = false;
  let orgId
  let token
  let server = process.env.NODE_ENV === 'development' ? 'localhost:8080' : 'gotv.ourvoiceusa.org';

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
