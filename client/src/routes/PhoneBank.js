/* eslint-disable no-mixed-operators */
import React, { Component } from 'react';
import { ActivityIndicator, Text, View } from '../lib/react-native';

import { _getApiToken, api_base_uri, openURL, getEpoch } from '../lib/common';
import { Button } from '../components/Buttons';

export class PhoneBank extends Component {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      server: 'demo.ourvoiceusa.org',//props.server,
      orgId: null,//props.orgId,
      admin: false,//props.admin,
      form: {
        id: "9fa67e4c-bb75-412c-ac52-e358071ea756",
      },//props.form,
      fetching: false,
      person: {},
      called: false,
    };
  }

  componentDidMount() {
    this._dataFetch();
  }

  _dataFetch = async () => {
    const { form, server, orgId } = this.state;

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
        if (res.status >= 400 && res.status < 500) return;// this.props.navigation.goBack(); // TODO: byeFelicia()
        throw new Error("Sync error");
      }

      this.setState({person: json});
    } catch (e) {
      console.warn(e);
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
        if (res.status >= 400 && res.status < 500) return;// this.props.navigation.goBack(); // TODO: byeFelicia()
        throw new Error("Sync error");
      }

      this.setState({person: json});
    } catch (e) {
      console.warn(e);
    }

    this._dataFetch();
  }

  call = async (input) => {
    await openURL('tel:+1'+input);
    this.setState({called: true, start: getEpoch()});
  }

  render() {
    const { admin, called, fetching, form, person } = this.state;

    if (fetching) return (
        <View style={{flex: 1, alignItems: 'center'}}>
          <Text>Loading Data...</Text>
          <ActivityIndicator />
        </View>
      );

    if (person && !person.phone) return (
      <View style={{flex: 1, alignItems: 'center'}}>
        <Text></Text>
        <Text>No Phone Numbers Available</Text>
        <Text></Text>
        <Text></Text>
        {(admin)&&
        <Text>There are no phone numbers available to you based on your assignments. Either all numbers have been dialed for this form, or there are no phone numbers in the system. To import data, use a web browser to login to https://apps.ourvoiceusa.org/HelloVoterHQ/</Text>
        ||
        <Text>Sorry, there aren't any phone numbers available to you based on your assignments. Please contact your administrator.</Text>
        }
      </View>
    );

    return (
      <View>
        <View style={{flex: 1, alignItems: 'center'}}>
          <Text>{form.name}</Text>
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
            <Text>How did it go?</Text>
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
          <Button block warning>
            <Text>I'm Done</Text>
          </Button>
        </View>
        }
      </View>
    );
  }
}
