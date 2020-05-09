import React, { Component } from 'react';
import { ActivityIndicator, View, TouchableOpacity, StyleSheet } from 'react-native';

//import { H1, Container, Content, Text, Button, Spinner } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';
import { _getApiToken, api_base_uri, openURL, triggerNetworkWarning, getEpoch } from './common';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      server: props.server,
      orgId: props.orgId,
      admin: props.admin,
      forms: props.forms,
      form: props.form,
      fetching: false,
      person: {},
      called: false,
    };
  }

  componentDidMount() {
    this._dataFetch();
  }

  _dataFetch = async () => {
    const { fetching, form, server, orgId } = this.state;

    this.setState({fetching: true});

    try {
      let https = true;
      if (server.match(/:8080/)) https = false;
      let res = await fetch('http'+(https?'s':'')+'://'+server+api_base_uri(orgId)+'/poc/phone/tocall', {
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

      this.setState({person: json});
    } catch (e) {
      triggerNetworkWarning(e);
    }

    this.setState({fetching: false});
  }

  callresult = async (status, donotcall) => {
    const { start, person, form, server, orgId } = this.state;

    this.setState({fetching: true, called: false});

    try {
      let https = true;
      if (server.match(/:8080/)) https = false;
      let res = await fetch('http'+(https?'s':'')+'://'+server+api_base_uri(orgId)+'/poc/phone/callresult', {
        method: 'POST',
        body: JSON.stringify({
          formId: form.id,
          personId: person.id,
          phone: person.phone,
          donotcall,
          status,
          start,
          end: getEpoch(),
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

      this.setState({person: json});
    } catch (e) {
      triggerNetworkWarning(e);
    }

    this._dataFetch();
  }

  call = async (input) => {
    let opened = await openURL('tel:+1'+input);
//    if (!opened) refer.alert(say("app_error"), say("unable_to_launch_external"));
    this.setState({called: true, start: getEpoch()});
  }

  render() {
    const { admin, called, fetching, form, person } = this.state;

    if (fetching) return (
        <View style={{flex: 1, alignItems: 'center'}}>
          <H1>Loading Data...</H1>
          <ActivityIndicator />
        </View>
      );

    if (person && !person.phone) return (
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
          <View style={{flex: 1, alignItems: 'center'}}>
            <H1>{form.name}</H1>
          </View>
          <Text></Text>
          <Text>Tap the call button below to call this person:</Text>
          <Text></Text>
          <Text>Name: {person.name}</Text>
          <Text></Text>
          {(person.party)&&
          <View>
            <Text>Party Affiliation: {person.party}</Text>
            <Text></Text>
          </View>
          }
          {(person.extra_info)&&
          <View>
            <Text>{person.extra_info}</Text>
            <Text></Text>
          </View>
          }
          <Text>Phone Number: {person.phone}</Text>
          <Text></Text>
          {(called)&&
          <View>
            <Text></Text>
            <View style={{flex: 1, alignItems: 'center'}}>
              <H1>How did it go?</H1>
            </View>
            <Text></Text>
            <Text></Text>
            <Button block success onPress={() => this.callresult(1, false)}>
              <Text>It went well!</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block info onPress={() => this.callresult(2, false)}>
              <Text>It didn't go well</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block warning onPress={() => this.callresult(0, false)}>
              <Text>No answer</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block primary onPress={() => this.callresult(3, false)}>
              <Text>Wrong number</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block danger onPress={() => this.callresult(2, true)}>
              <Text>Do not call</Text>
            </Button>
          </View>
          ||
          <View>
            <Button block primary onPress={() => this.call(person.phone)}>
              <Text>Call</Text>
            </Button>
            <Text></Text>
            <Text></Text>
            <Button block warning onPress={() => {
              const resetAction = StackActions.reset({
                index: 0,
                actions: [
                  NavigationActions.navigate({ routeName: 'HomeScreen'})
                ]
              });
              this.props.navigation.dispatch(resetAction);
            }}>
              <Text>I'm Done</Text>
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
