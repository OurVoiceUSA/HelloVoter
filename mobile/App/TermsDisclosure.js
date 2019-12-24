import React from 'react';
import { View } from 'react-native';
import { Container, Content, Body, Text, H1, Button, ListItem, CheckBox } from 'native-base';

import HVComponent, { HVConfirmDialog } from './HVComponent';

import { NavigationActions } from 'react-navigation';
import storage from 'react-native-storage-wrapper';

import {
  STORAGE_KEY_DISCLOSURE, URL_TERMS_OF_SERVICE,
  say, getEpoch, openURL,
} from './common';

export async function loadDisclosure(refer) {
  try {
    const value = await storage.get(STORAGE_KEY_DISCLOSURE);
    if (value !== null) {
      refer.setState({showDisclosure: false});
    } else {
      refer.setState({showDisclosure: true});
    }
  } catch (error) {}
}

export default class ListTab extends HVComponent {

  locationIcon = null;

  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      ack: false,
      tosError: false,
    };
  }

  render() {
    const { refer, ack, tosError } = this.state;

    return (
      <Container>
        <Content padder>
          <View style={{flex: 1, alignItems: 'center'}}>
            <H1>{say("termsofservice")}</H1>
          </View>

          <Text></Text>

          <Text>
            Our Voice USA provides this canvassing tool for free for you to use for your own purposes.
          </Text>

          <Text></Text>

          <Text>
            By using this tool you acknowledge that you are acting on your own behalf, do not represent Our Voice USA
            or its affiliates, and have read our <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => openURL(URL_TERMS_OF_SERVICE)}>
            Terms of Service</Text>.
          </Text>

          <Text></Text>

          <Text>Please be courteous to those you meet.</Text>

          <Text></Text>

          <ListItem onPress={() => this.setState({ack: !ack})} error>
            <CheckBox checked={ack} onPress={() => this.setState({ack: !ack})} />
            <Body>
              <Text>I have read & agree to the Terms of Service</Text>
            </Body>
          </ListItem>

          <Text></Text>

          <Button block onPress={() => {
            if (ack) {
              try {
                storage.set(STORAGE_KEY_DISCLOSURE, getEpoch().toString());
                refer.setState({ showDisclosure: false, disclosureWasShown: true });
              } catch (error) {}
            } else {
              this.alert(say("termsofservice"), say("must_agree_to_tos"));
            }
          }}>
            <Text>Continue</Text>
          </Button>

          <Text></Text>

          <Button block danger onPress={() => refer.props.navigation.dispatch(NavigationActions.back())}>
            <Text>Exit</Text>
          </Button>

          <HVConfirmDialog refer={this} />

        </Content>
      </Container>
    );
  }
}
