import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Heading, MediumText } from "../../components/Type";
import {
  Root,
  Content,
  Row,
  ViewFlex,
  Space,
  ViewCenter,
} from "../../components/Layout";
import { Button } from "../../components/Buttons";

export const CampaignScreen = ({ navigation, route }) => {
  return (
    <Root>
      <Content>
        <Heading>Campaign dashboard</Heading>
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
            <Button
              icon="envelope"
              onPress={() =>
                navigation.navigate("Postcard", {
                  campaignTitle: route.params.campaignTitle,
                })
              }
            >
              Send postcard
            </Button>
          </ViewFlex>
          <ViewFlex>
            <Button
              icon="phone"
              onPress={() =>
                navigation.navigate("PhoneBank", {
                  campaignTitle: route.params.campaignTitle,
                })
              }
            >
              Phone bank
            </Button>
          </ViewFlex>
          <ViewFlex>
            <Button
              icon="home"
              onPress={() =>
                navigation.navigate("KnockDoor", {
                  campaignTitle: route.params.campaignTitle,
                })
              }
            >
              Knock doors
            </Button>
          </ViewFlex>
        </Row>
      </Content>
    </Root>
  );
};
