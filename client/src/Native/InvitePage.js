
import React, { PureComponent } from 'react';

import {
  Linking,
  View,
} from 'react-native';

import { Container, Content, H3, Text, Spinner, Footer, FooterTab, Button } from 'native-base';

import { StackActions, NavigationActions } from 'react-navigation';
import Icon from 'react-native-vector-icons/FontAwesome';
import storage from 'react-native-storage-wrapper';

import { say } from './common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      error: false,
    };
  }

  componentDidMount() {
    Linking.addEventListener('url', this.handleOpenURL);

    Linking.getInitialURL()
    .then((url) => {
      if (url) this.handleOpenURL({url});
      else this.setError();
    })
    .catch(() => this.setError());
  }

  setError() {
    this.setState({error: true});
  }

  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleOpenURL);
  };

  handleOpenURL = async ({ url }) => {
    try {
      await storage.set('HV_INVITE_URL', url);
      return this.goHome();
    } catch(e) {
      console.warn("handleOpenURL: "+e);
    }
    this.setError();
  }

  goHome() {
    const resetAction = StackActions.reset({
      index: 0,
      actions: [
        NavigationActions.navigate({ routeName: 'HomeScreen'})
      ]
    });
    this.props.navigation.dispatch(resetAction);
  }

  render() {
    if (this.state.error) return (
      <Container>
        <Content padder>
          <H3>There was a problem</H3>
          <Text></Text>
          <Text>
            Completely close this app and try the invite link again. If trouble persists,
            ask for a QR Code and scan it from the canvassing screen.
          </Text>
        </Content>
        <Footer>
          <FooterTab>
            <Button onPress={() => this.goHome()}>
              <Icon name="undo" size={25} />
              <Text>{say("home")}</Text>
            </Button>
          </FooterTab>
        </Footer>
      </Container>
    );
    return (<Spinner />);
  }

}
