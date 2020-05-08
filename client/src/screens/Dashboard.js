import React from "react";
import { Text, View } from 'react-native';

import { ViewFlex, Row } from '../components/Layout';
import { Button } from "../components/Buttons";
import * as storage from '../lib/storage';
import { Link } from '../App/routing';

export const Dashboard = ({ refer }) => {
  const { user } = refer.state;

  return (
    <View>
      <Text>Welcome, {user.name}</Text>
      <Text></Text>
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
      <Button to="/settings" title="Settings" />
      <Button
        title="Logout"
        alt={true}
        onPress={() => {
          storage.del('jwt');
          refer.setState({user: null});
        }}
      />
    </View>
  );
};
