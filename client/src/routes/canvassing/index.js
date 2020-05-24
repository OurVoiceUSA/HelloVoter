import React from "react";
import { Text } from '../../lib/react-native';

import AppStoreButtons from '../../components/AppStoreButtons'
import { Root, Content } from '../../components/Layout';

export default ({ refer }) => {
  return (
    <Root>
      <Content>
        <Text>For canvassing features, please download our mobile app:</Text>
        <AppStoreButtons refer={refer} />
      </Content>
    </Root>
  );
};
