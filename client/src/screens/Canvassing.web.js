import React from "react";
import { Text, View } from 'react-native';

import { Root, Content } from '../components/Layout';

export const Canvassing = ({ navigation }) => {
  return (
    <Root>
      <Content>
        <Text>For canvassing features, please download our mobile app:</Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <a href="https://play.google.com/store/apps/details?id=org.ourvoiceinitiative.ourvoice"><img alt="Google Play Store" src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png" height="62" width="158" /></a>
          <a href="https://itunes.apple.com/us/app/our-voice-usa/id1275301651?ls=1&amp;mt=8"><img alt="Apple Store" src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" height="43" width="130" /></a>
        </View>
      </Content>
    </Root>
  );
};
