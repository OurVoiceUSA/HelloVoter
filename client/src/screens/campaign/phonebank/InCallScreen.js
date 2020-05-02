import React from "react";
import {
  Heading,
  MediumText,
  MediumStrongText,
} from "../../../components/Type";
import { Button } from "../../../components/Buttons";
import { Root, Content, Spacer } from "../../../components/Layout";
import { CommonActions } from "@react-navigation/native";

export const InCallScreen = ({ navigation, route }) => {
  return (
    <Root>
      <Content>
        <Heading>In call with this voter:</Heading>
        <MediumText>{route.params.voter}</MediumText>
        <MediumStrongText>Script:</MediumStrongText>
        <MediumText>
          It's important that you vote for your neighbour Jordan Young for
          Cornwall Lister next Tuesday. Are you:
        </MediumText>
        <MediumText>1. Planning to vote</MediumText>
        <MediumText>2. Planning to vote and need a ride</MediumText>
        <MediumText>3. Not planning to vote</MediumText>
        <Spacer />
        <Button onPress={() => navigation.dispatch(CommonActions.goBack())}>
          Record Answers
        </Button>
        <Button onPress={() => navigation.dispatch(CommonActions.goBack())}>
          Hung Up
        </Button>
      </Content>
    </Root>
  );
};
