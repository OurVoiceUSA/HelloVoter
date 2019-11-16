import React from 'react';
import { View } from 'react-native';
import { Container, Content, Text, Spinner } from 'native-base';

import LocationComponent from '../LocationComponent';
import HVComponent from '../HVComponent';
import TermsDisclosure, { loadDisclosure } from '../TermsDisclosure';

import { api_base_uri, _getApiToken } from '../common';

import storage from 'react-native-storage-wrapper';
import KeepAwake from 'react-native-keep-awake';

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

    // TODO:
    // get OrgID
    // loop until res.status is 200 or not 418
    // for each form, loop through data & post it
    // remove forms & re-add forms
    // navigate back
    // this.goBack();
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
            <Text>Converting data format, this may take several minutes.</Text>
            <Spinner />
          </View>
          }
        </Content>
        <KeepAwake />
      </Container>
    );
  }
}
