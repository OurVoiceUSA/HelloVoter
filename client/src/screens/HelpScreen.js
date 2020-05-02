import React from "react";
import { Root, Content } from "../components/Layout";
import { Button } from "../components/Buttons";

export const HelpScreen = ({ navigation }) => {
  return (
    <Root>
      <Content>
        <Button onPress={() => navigation.goBack()} title="Go back home" />
      </Content>
    </Root>
  );
};
