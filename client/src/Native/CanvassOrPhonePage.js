import React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { H1, Container, Header, Content, Footer, FooterTab, Text, Button, Spinner } from 'native-base';

import HVComponent, { HVConfirmDialog } from './HVComponent';

import { StackActions, NavigationActions } from 'react-navigation';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
  DINFO, _getJWT, _saveJWT, _loginPing, _logout, _saveUser, openURL, openGitHub,
  _apiCall, _specificAddress, permissionNotify, permissionLocation, say,
} from './common';

export default class App extends HVComponent {

  constructor(props) {
    super(props);

    this.state = {
      args: props.navigation.state.params,
    };
  }

  render() {
    const { navigate } = this.props.navigation;
    const {args} = this.state;

    return (
      <Container>
        <Content padder>

          <H1>Select Campaign Mode</H1>

          <Text></Text>
          <Text></Text>
          <Text></Text>
          <Text></Text>

          <Button block primary onPress={() => {
            navigate('Canvassing', args)
          }}>
            <Text>Knock Doors</Text>
          </Button>

          <Text></Text>
          <Text></Text>

          <Button block success onPress={() => {
            navigate('PhoneBank', args)
          }}>
            <Text>Phone Bank</Text>
          </Button>

          <Text></Text>
          <Text></Text>

          <Button block danger onPress={() => this.props.navigation.goBack()}>
            <Text>Exit</Text>
          </Button>

        </Content>

    </Container>
    );
  }
}

const colors = {
  white: "#FFFFFF",
  monza: "#C70039",
  switchEnabled: "#C70039",
  switchDisabled: "#efeff3",
  blueGem: "#27139A",
};
