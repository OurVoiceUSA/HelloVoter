import React from 'react';

import { View } from 'react-native';
import {
  Container, Content, Body, Text, H3, Button, Spinner, Segment, ListItem, CheckBox
} from 'native-base';
import { NavigationActions } from 'react-navigation';
import storage from 'react-native-storage-wrapper';
import { ConfirmDialog } from 'react-native-simple-dialogs';

import { say, getEpoch, openURL } from '../common';
import HVComponent from '../HVComponent';

const STORAGE_KEY_DISCLOSURE = 'OV_DISCLOUSER';

export async function loadDisclosure(refer) {
  try {
    const value = await storage.get(STORAGE_KEY_DISCLOSURE);
    if (value !== null) {
      refer.setState({showDisclosure: false});
    }
  } catch (error) {}
}

function openCanvassGuidelines() {
  openURL("https://github.com/OurVoiceUSA/HelloVoter/blob/master/docs/Canvassing-Guidelines.md");
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
          <Button block transparent onPress={() => openCanvassGuidelines()}>
            <H3>Terms of Service</H3>
          </Button>

          <Text></Text>

          <Text>
            Our Voice USA provides this canvassing tool for free for you to use for your own purposes.
          </Text>

          <Text></Text>

          <Text>
            By using this tool you acknowledge that you are acting on your own behalf, do not represent Our Voice USA
            or its affiliates, and have read our <Text style={{fontSize: 18, fontWeight: 'bold', color: 'blue'}} onPress={() => openCanvassGuidelines()}>
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
                refer.setState({ showDisclosure: false});
              } catch (error) {}
            } else {
            this.setState({tosError: true});
            }
          }}>
            <Text>Continue</Text>
          </Button>

          <Text></Text>

          <Button block danger onPress={() => refer.props.navigation.dispatch(NavigationActions.back())}>
            <Text>Exit</Text>
          </Button>

          <ConfirmDialog
            title="Terms of Service"
            message="You must agree to the terms of service to continue."
            visible={tosError}
            animationType="fade"
            onTouchOutside={() => this.setState({tosError: false})}
            positiveButton={{title: "OK", onPress: () => this.setState({tosError: false})}}
          />

        </Content>
      </Container>
    );
  }
}
