import React from 'react';
import { ActivityIndicator, Text } from '../lib/react-native';

import { Layout } from '.';

const Loading = ({refer}) => (
  <Layout.Root>
    <Layout.Content>
      <Layout.ViewCenter>
        <Text>Loading HelloVoter...</Text>
        <Layout.Space />
        <ActivityIndicator size="large" />
      </Layout.ViewCenter>
    </Layout.Content>
  </Layout.Root>
);

export default Loading;
