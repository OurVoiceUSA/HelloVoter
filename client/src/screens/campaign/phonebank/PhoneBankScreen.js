import React from "react";
import {
  Heading,
  MediumText,
  MediumStrongText,
} from "../../../components/Type";
import { Button } from "../../../components/Buttons";
import {
  Root,
  Content,
  Spacer,
  ViewFlex,
  Row,
} from "../../../components/Layout";
import { CommonActions } from "@react-navigation/native";

export const PhoneBankScreen = ({ navigation, route }) => {
  return (
    <Root>
      <Content>
        <Heading>Call this voter:</Heading>
        <MediumText>John Levine</MediumText>
        <MediumText>24 Washington St</MediumText>
        <MediumText>Cornwall, VT0345</MediumText>
        <Button>Call Voter</Button>
        <Row>
          <ViewFlex>
            <Button onPress={() => navigation.dispatch(CommonActions.goBack())}>
              Cancel
            </Button>
          </ViewFlex>
          <ViewFlex>
            <Button onPress={() => navigation.dispatch(CommonActions.goBack())}>
              No Answer
            </Button>
            <Button onPress={() => navigation.dispatch(CommonActions.goBack())}>
              Hung Up
            </Button>
          </ViewFlex>
        </Row>
        <MediumStrongText>Greeting:</MediumStrongText>
        <MediumText>
          Hello! I'm calling about the election for Cornwall Lister next
          Tuesday.
        </MediumText>
        <Spacer />
        <Button
          onPress={() =>
            navigation.navigate("InCall", {
              voter: "John Levine",
              campaignTitle: route.params.campaignTitle,
            })
          }
        >
          Call connected
        </Button>
      </Content>
    </Root>
  );
};
