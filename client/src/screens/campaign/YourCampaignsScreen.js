import * as React from "react";
import { View } from "react-native";
import { RowItem } from "../../components/RowItem";
import { Heading } from "../../components/Type";
import { Button } from "../../components/Buttons";
import { Root, Content } from "../../components/Layout";

export const YourCampaignsScreen = ({ navigation }) => {
  const CampaignRow = ({ text }) => (
    <RowItem
      text={text}
      onPress={() => {
        navigation.navigate("Campaign", { campaignTitle: text });
      }}
    />
  );

  return (
    <Root>
      <Content>
        <Heading>Your campaigns</Heading>
        <CampaignRow text={"Jordan Young for Cornwall Lister"} />
        <CampaignRow text={"Marie Sperry for Cornwall Weigher of Coal"} />
        <View style={{ flex: 1 }} />
        <Button>Scan QR Code to Join Campaign</Button>
        <Button alt>Create Campaign</Button>
      </Content>
    </Root>
  );
};
