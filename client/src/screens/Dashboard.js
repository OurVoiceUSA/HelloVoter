import React from 'react';
import { View } from 'react-native';

import { ViewCenter, ViewFlex, Row, Space } from '../components/Layout';
import { Heading, MediumText } from '../components/Type';
import { Button } from '../components/Buttons';

export const Dashboard = ({ refer }) => {
  const { user } = refer.state;

  return (
    <View>
      <Heading>Welcome, {user.name}</Heading>
      <Space />
      <ViewCenter>
        <MediumText>You've knocked on 14 doors.</MediumText>
        <MediumText>You've sent 18 postcards.</MediumText>
        <MediumText>You've made 35 phone calls.</MediumText>
      </ViewCenter>
      <ViewFlex />
      <Heading>What do you want to do?</Heading>
      <Row>
        <ViewFlex>
          <Button>
            Phone Banking
          </Button>
          <Button>
            Post Cards
          </Button>
        </ViewFlex>
        <ViewFlex>
          <Button to="/canvassing">
            Canvassing
          </Button>
          <Button>
            Your Reps
          </Button>
        </ViewFlex>
      </Row>
    </View>
  );
};
