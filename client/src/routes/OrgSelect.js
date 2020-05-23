/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react';
import { Platform, Text } from '../lib/react-native';

import * as Layout from '../components/Layout';
import { localaddress, openURL } from '../lib/common';
import { URL_PRIVACY_POLICY } from '../lib/consts';
import { Button } from '../components/Buttons';
import { Heading } from '../components/Type';

const OrgSelect = ({ refer }) => (
  <Layout.Root>
    <Layout.Content>
      <Heading>Select OrgID</Heading>
      <Layout.ViewCenter>
        <Button onPress={() => refer.setOrg("DEMO")}>
          <Text>DEMO</Text>
        </Button>
        <Layout.Space />
      </Layout.ViewCenter>
    </Layout.Content>
  </Layout.Root>
);

export default OrgSelect;
