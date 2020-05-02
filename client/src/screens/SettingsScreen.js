import React from "react";
import { Text } from "react-native";
import { Root, Content } from "../components/Layout";
import { Button } from "../components/Buttons";

export const SettingsScreen = ({ navigation }) => {
  return (
    <Root>
      <Content>
        <Text>Change your settings here</Text>
        <Button onPress={() => navigation.goBack()} title="Go back home" />
      </Content>
    </Root>
  );
};
