import React from 'react';
import { View } from 'react-native';
import { Container, Content, Text, Spinner } from 'native-base';

import HVComponent from '../HVComponent';
import TermsDisclosure, { loadDisclosure } from '../TermsDisclosure';

import { api_base_uri, _getApiToken } from '../common';

import storage from 'react-native-storage-wrapper';
import KeepAwake from 'react-native-keep-awake';
import { sleep } from 'ourvoiceusa-sdk-js';

export default class App extends HVComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
      state: props.navigation.state.params.state,
      showDisclosure: null,
    };

    // reload forms when they go back
    this.goBack = this.props.navigation.goBack;
    this.props.navigation.goBack = () => {
      this.state.refer._loadForms();
      this.goBack();
    };
  }

  componentDidMount() {
    loadDisclosure(this);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.showDisclosure !== false && this.state.showDisclosure === false) {
      this.doLegacyConversion();
    }
  }

  doLegacyConversion = async () => {
    const { state } = this.state;

    try {
      // get OrgID
      let res = await fetch('https://gotv-'+state+'.ourvoiceusa.org/orgid/v1/new', {
        method: 'POST',
        body: JSON.stringify({state}),
        headers: {
          'Authorization': 'Bearer '+await _getApiToken(),
          'Content-Type': 'application/json',
        },
      });

      if (res.status !== 200) throw "OrgID error";

      let json = await res.json();

      let orgId = json.orgid;

      // loop until res.status is not 418
      let retry = true;
      for (let retries = 0; (retries < 12 && retry === true); retries++) {
        let res = await fetch('https://gotv-'+state+'.ourvoiceusa.org'+api_base_uri(orgId)+'/uncle', {
          headers: {
            'Authorization': 'Bearer '+await _getApiToken(),
            'Content-Type': 'application/json',
          },
        });
        let uncle = res.json();
        if (res.status === 418) {
          // try again in 10 seconds
          await sleep(10000);
        } else {
          retry = false;
          if (res.status !== 200) throw "unexpected http code returned";
        }
      }

      if (retry) throw "tried too many times"

      // for each form, loop through data & post it
      // remove forms & re-add forms
      // navigate back
      // this.goBack();
    } catch (e) {
      this.setState({error: true});
    }
  }

  render() {
    const { navigate } = this.props.navigation;
    const { showDisclosure, error } = this.state;

    // initial render
    if (showDisclosure === null) {
      return (
        <Container>
          <Content>
            <Spinner />
          </Content>
        </Container>
      );
    } else if (showDisclosure) {
      return (<TermsDisclosure refer={this} />);
    }

    return (
      <Container>
        <Content padder>
          {error&&
            <Text>There was an error. Please try again later.</Text>
          ||
          <View>
            <Text>Converting data format, this may take several minutes. Please do not close the app while this processes runs. You only need to do this conversion once.</Text>
            <Spinner />
          </View>
          }
        </Content>
        <KeepAwake />
      </Container>
    );
  }
}
