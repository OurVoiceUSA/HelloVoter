import React from "react";
import { Text } from 'react-native';
import { Root, Content } from "../components/Layout";
import { Button } from "../components/Buttons";

import { Link } from '../App/routing';

export const Canvassing = ({ navigation }) => {
  return (
    <Root>
      <Content>
        <Text>Please download the mobile app</Text>
        <Button to="/" title="Home" />
      </Content>
    </Root>
  );
};
