import React from "react";
import {
  Heading,
  MediumText,
  MediumStrongText,
} from "../../../components/Type";
import { Button } from "../../../components/Buttons";
import { Root, Content, Spacer } from "../../../components/Layout";
import { CommonActions } from "@react-navigation/native";

export const PostcardScreen = ({ navigation }) => {
  return (
    <Root>
      <Content>
        <Heading>Write a postcard to:</Heading>
        <MediumText>John Levine</MediumText>
        <MediumText>24 Washington St</MediumText>
        <MediumText>Cornwall, VT0345</MediumText>
        <MediumStrongText>Message:</MediumStrongText>
        <MediumText>
          It's important that you vote for your neighbour Jordan Young for
          Cornwall Lister next Tuesday!
        </MediumText>
        <Spacer />
        <Button onPress={() => navigation.dispatch(CommonActions.goBack())}>
          Sent it
        </Button>
        <Button onPress={() => navigation.dispatch(CommonActions.goBack())}>
          Cancel
        </Button>
      </Content>
    </Root>
  );
};
