import React from 'react';
import { Text } from '../lib/react-native';

import { STORAGE_KEY_DISCLOSURE, URL_TERMS_OF_SERVICE } from '../lib/consts';
import { Layout } from '../components';
import { Button } from '../components/Buttons';
import { Heading } from '../components/Type';
import { storage, common } from '../lib';

export default ({ refer }) => (
  <Layout.Root>
    <Layout.Content>
      <Layout.ViewCenter>
        <Heading>Terms of Service</Heading>

        <Text>
          Our Voice USA provides this app for free for you to use for your own purposes.
        </Text>

        <Layout.Space />

        <Text>
          By using this app you acknowledge that you are acting on your own behalf, do not represent Our Voice USA
          or its affiliates, and have read our <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => common.openURL(URL_TERMS_OF_SERVICE)}>
          Terms of Service</Text>.
        </Text>

        <Layout.Space />

        <Text>Please be courteous to those you interact with.</Text>

        <Layout.Space />

        <Button onPress={() => {
          storage.set(STORAGE_KEY_DISCLOSURE, common.getEpoch().toString());
          refer.setState({tos: true});
        }} error>
            <Text>I have read & agree to the Terms of Service</Text>
        </Button>

        <Layout.Space />

        <Button block danger onPress={() => refer.logout()}>
          <Text>I do not agree, Exit</Text>
        </Button>
      </Layout.ViewCenter>
    </Layout.Content>
  </Layout.Root>
);
