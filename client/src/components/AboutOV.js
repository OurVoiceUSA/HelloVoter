/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react';
import { Platform, Text, View } from '../lib/react-native';

import { URL_TERMS_OF_SERVICE, URL_PRIVACY_POLICY, } from '../lib/consts';
import { openURL, openGitHub } from '../lib/common';
import { Button } from './Buttons';
import { Icon, Layout } from '.';

export default ({ refer }) => (
  <Layout.ViewCenter>
    <Layout.Space />
    <Text>Built with ❤️ by Our Voice USA</Text>
    <Layout.Space />
    <Text>Find us on various online networks:</Text>
    <Layout.Space />
    <View style={{flexDirection: 'row', justifyContent: 'center'}}>
      <Icon.Facebook size={40} color="#3b5998" style={{marginRight: 25}} onPress={openURL.bind(refer, 'https://m.facebook.com/OurVoiceUsa')} />
      <Icon.Twitter size={40} color="#0084b4" style={{marginRight: 25}} onPress={openURL.bind(refer, 'https://twitter.com/OurVoiceUsa')} />
      <Icon.YouTube size={40} color="#ff0000" style={{marginRight: 25}} onPress={openURL.bind(refer, 'https://www.youtube.com/channel/UCw5fpnK-IZVQ4IkYuapIbiw')} />
      <Icon.GitHub size={40} style={{marginRight: 25}} onPress={openGitHub.bind(refer)} />
      <Icon.Globe size={40} color="#008080" onPress={openURL.bind(refer, 'https://ourvoiceusa.org/')} />
    </View>
    <Layout.Space />
    <Layout.Space />
    <Text>Not for any candidate or political party.</Text>
    <Layout.Space />
    <Text>Copyright (c) 2020, Our Voice USA. All rights reserved.</Text>
    <Layout.Space />
    <Text style={{width: 350}}>
      This program is free software; you can redistribute it and/or
      modify it under the terms of the GNU Affero General Public License
      as published by the Free Software Foundation; either version 3
      of the License, or (at your option) any later version.
    </Text>
    <Layout.Space />
    <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
      <Button primary onPress={openURL.bind(refer, URL_TERMS_OF_SERVICE)}><Text>Terms of Service</Text></Button>
      <Text>{'  '}</Text>
      <Button primary onPress={openURL.bind(refer, URL_PRIVACY_POLICY)}><Text>Privacy Policy</Text></Button>
    </View>
    <Button block danger onPress={openGitHub.bind(refer, 'HelloVoter')}>
      <Text>App Source Code</Text>
    </Button>
  <Layout.Space />
  {Platform.OS === 'ios'&&
  <Text>NOTE: Distribution on the iOS App Store means this specific copy of the app falls under the Apple Inc. Standard EULA.</Text>
  }
  </Layout.ViewCenter>
);
