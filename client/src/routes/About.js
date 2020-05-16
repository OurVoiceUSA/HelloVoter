/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react';
import { Text, View, Platform } from '../lib/react-native';

import { URL_TERMS_OF_SERVICE, URL_PRIVACY_POLICY, } from '../lib/consts';
import { ViewCenter, Space } from '../components/Layout';
import { openURL, openGitHub } from '../lib/common';
import { Button } from '../components/Buttons';
import { version } from '../../package.json';

export const About = props => (
  <ViewCenter>
    <Text>
      HelloVoter Version {version}
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
    <Space />
      <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
        <Button primary onPress={() => openURL(URL_TERMS_OF_SERVICE)}><Text>Terms of Service</Text></Button>
        <Text>{'  '}</Text>
        <Button primary onPress={() => openURL(URL_PRIVACY_POLICY)}><Text>Privacy Policy</Text></Button>
      </View>
      <Button block danger onPress={() => openGitHub('HelloVoter')}>
      <Text>App Source Code</Text>
      </Button>
    <Space />
    {Platform.OS === 'ios'&&
    <Text>NOTE: Distribution on the iOS App Store means this specific copy of the app falls under the Apple Inc. Standard EULA.</Text>
    }
  </ViewCenter>
);
