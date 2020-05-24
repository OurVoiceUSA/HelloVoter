import React from 'react';
import { Text } from '../lib/react-native';

import AppStoreButtons from '../components/AppStoreButtons'
import { Root, Content } from '../components/Layout';

export default ({ refer }) => {
  return (
    <Root>
      <Content>
        <Text>We welcome your feedback! Please rate us on the app stores.</Text>
        <AppStoreButtons refer={refer} />
      </Content>
    </Root>
  );
};
