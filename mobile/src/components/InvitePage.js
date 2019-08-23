
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Linking,
} from 'react-native';

import { StackActions, NavigationActions } from 'react-navigation';
import storage from 'react-native-storage-wrapper';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
    };

  }

  componentDidMount() {
    Linking.addEventListener('url', this.handleOpenURL);
    // Launched from an external URL
    Linking.getInitialURL().then((url) => {
      if (url) this.handleOpenURL({ url });
      else this.goHome();
    });
  }

  componentWillUnmount() {
    // Remove event listener
    Linking.removeEventListener('url', this.handleOpenURL);
  };

  handleOpenURL = async ({ url }) => {
    try {
      await storage.set('HV_INVITE_URL', url);
    } catch(e) {
      console.warn("handleOpenURL: "+e);
    }
    this.goHome();
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
    return (<ActivityIndicator size="large" />);
  }

}

