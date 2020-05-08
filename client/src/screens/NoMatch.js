import React from 'react';
import { Text, View } from 'react-native';

import { Button } from "../components/Buttons";

export const NoMatch = ({ location }) => (
  <View>
    <Text>OOOPS!!</Text>
    <Text></Text>
    <Text>We can't seem to find the screen you're looking for:</Text>
    <Text></Text>
    <Text>{location.pathname}</Text>
    <Text></Text>
    <Button to="/" title="Back to Dashboard" />
  </View>
);
