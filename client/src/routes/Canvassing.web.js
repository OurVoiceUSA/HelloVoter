import React from "react";
import { Text, View, TouchableOpacity } from '../lib/react-native';

import { URL_APPLE_IOS, URL_GOOGLE_PLAY } from '../lib/consts';
import { Root, Content } from '../components/Layout';
import { openURL } from '../lib/common';

export const Canvassing = ({refer}) => {
  return (
    <Root>
      <Content>
        <Text>For canvassing features, please download our mobile app:</Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={openURL.bind(refer, URL_GOOGLE_PLAY)}>
            <img alt="Google Play Store" src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png" height="62" width="158" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openURL.bind(refer, URL_APPLE_IOS)}>
            <img alt="Apple Store" src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" height="43" width="130" />
          </TouchableOpacity>
        </View>
      </Content>
    </Root>
  );
};
