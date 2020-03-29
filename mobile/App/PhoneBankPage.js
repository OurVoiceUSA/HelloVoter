import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

import { H1, Container, Content, Text, Button, Spinner } from 'native-base';

import HVComponent, { HVConfirmDialog } from './HVComponent';

import { StackActions, NavigationActions } from 'react-navigation';
import Icon from 'react-native-vector-icons/FontAwesome';
import { _getApiToken, api_base_uri, openURL, triggerNetworkWarning } from './common';

export default class App extends HVComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
      server: props.navigation.state.params.server,
      orgId: props.navigation.state.params.orgId,
      admin: props.navigation.state.params.admin,
      forms: props.navigation.state.params.forms,
      form: props.navigation.state.params.forms[0], // fixme
      fetching: false,
      target: {},
      called: false,
    };
  }

  componentDidMount() {
    this._dataFetch();
  }

  _dataFetch = async () => {
    const { fetching, form, server, orgId } = this.state;

    if (fetching) return;

    this.setState({fetching: true, called: false});

    try {
      let https = true;
      if (server.match(/:8080/)) https = false;
      let res = await fetch('http'+(https?'s':'')+'://'+server+api_base_uri(orgId)+'/people/get/tocall', {
        method: 'POST',
        body: JSON.stringify({
          formId: form.id,
        }),
        headers: {
          'Authorization': 'Bearer '+await _getApiToken(),
          'Content-Type': 'application/json',
        },
      });

      let json = await res.json();

      if (res.status !== 200 || json.error === true) {
        if (res.status >= 400 && res.status < 500) return this.props.navigation.goBack(); // TODO: byeFelicia()
        throw "Sync error";
      }

      this.setState({target: json});
    } catch (e) {
      triggerNetworkWarning(e);
    }

    this.setState({fetching: false});
  }

  call = async (input) => {
    let opened = await openURL('tel:+1'+input);
//    if (!opened) refer.alert(say("app_error"), say("unable_to_launch_external"));
    this.setState({called: true});
  }

  render() {
    const { admin, called, fetching, target } = this.state;

    if (fetching) return (
        <View style={{flex: 1, alignItems: 'center'}}>
          <H1>Loading Data...</H1>
          <Spinner />
        </View>
      );

    if (target && !target.phone) return (
      <View style={{flex: 1, alignItems: 'center'}}>
        <Text></Text>
        <H1>No Phone Numbers Available</H1>
        <Text></Text>
        <Text></Text>
        {(admin)&&
        <Text>There are no phone numbers available to you based on your assignments. Either all numbers have been dialed for this form, or there are no phone numbers in the system. To import data, use a web browser to login to https://apps.ourvoiceusa.org/HelloVoterHQ/</Text>
        ||
        <Text>Sorry, there aren't any phone numbers available to you based on your assignments. Please contact your administrator.</Text>
        }
        <Text></Text>
        <Text></Text>
        <Button block danger onPress={() => this.props.navigation.goBack()}>
          <Text>Go Back</Text>
        </Button>
      </View>
    );

    return (
      <Container>
        <Content padder>
          <Text>Welcome to PHONE BANKING (a quick-n-dirty POC)</Text>
          <Text></Text>
          <Text>Tap the call button below to call this person:</Text>
          <Text></Text>
          <Text>Name: {target.name}</Text>
          <Text></Text>
          {(target.party)&&
          <View>
            <Text>Party Affiliation: {target.party}</Text>
            <Text></Text>
          </View>
          }
          <Text>Phone Number: {target.phone}</Text>
          <Text></Text>
          {(called)&&
          <View>
            <Text></Text>
            <View style={{flex: 1, alignItems: 'center'}}>
              <H1>How did it go?</H1>
            </View>
            <Text></Text>
            <Text></Text>
            <Button block success onPress={() => this._dataFetch()}>
              <Text>It went well!</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block info onPress={() => this._dataFetch()}>
              <Text>It didn't go well</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block warning onPress={() => this._dataFetch()}>
              <Text>No answer</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block primary onPress={() => this._dataFetch()}>
              <Text>Wrong number</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block danger onPress={() => this._dataFetch()}>
              <Text>Do not call</Text>
            </Button>
          </View>
          ||
          <View>
            <Button block primary onPress={() => this.call(target.phone)}>
              <Text>Call</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block warning onPress={() => this._dataFetch()}>
              <Text>Skip</Text>
            </Button>
          </View>
          }
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


const styles = StyleSheet.create({
  iconContainer: {
    backgroundColor: '#ffffff', width: 65, height: 65, borderRadius: 65,
    borderWidth: 2, borderColor: '#000000',
    alignItems: 'center', justifyContent: 'center', margin: 2.5,
  },
});
