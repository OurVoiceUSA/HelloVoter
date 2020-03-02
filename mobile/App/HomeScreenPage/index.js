import React from 'react';
import { View } from 'react-native';
import { Container, Header, Content, Footer, FooterTab, Text, Button, Spinner } from 'native-base';

import HVComponent from '../HVComponent';
import Home from './HomeTab';
import YourReps from './YourRepsTab';
import CanvassingSetup from './CanvassingTab';
import Supporters from './Supporters';
import Legal from './Legal';
import { carouselItems } from './HomeTab/CarouselItems';

import Icon from 'react-native-vector-icons/FontAwesome';
import storage from 'react-native-storage-wrapper';

import { say, DINFO, permissionNotify, openURL } from '../common';

export default class App extends HVComponent {

  constructor(props) {
    super(props);

    this.state = {
      active: 'home',
      appVersion: "unknown",
      BundleId: "unknown",
      carouselItems: carouselItems(this),
      sliderActiveSlide: 0,
      patreonNames: [],
      ctidx: 0,
      yridx: 0,
    };
  }

  componentDidMount() {
    this.loadPatreonNames();
    permissionNotify();
    this.checkForInvite();
    DINFO().then(i => this.setState({appVersion: i.Version, BundleId: i.BundleId})).catch(e => console.warn(e));
  }

  loadPatreonNames = async () => {
    try {
      let res = await fetch("https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/master/supporters.json");
      let patreonNames = (await res.json()).patreon;
      this.setState({patreonNames});
    } catch (e) {
      this.setState({patreonNames:[say("unexpected_error_try_again")]});
    }
  }

  checkForInvite = async() => {
    try {
      let inviteUrl = await storage.get('HV_INVITE_URL');
      if (inviteUrl) this.setState({active: 'canvassing'});
    } catch(e) {
      console.warn(e);
    }
  }

  render() {
    const { active, appVersion, BundleId, carouselItems, sliderActiveSlide, patreonNames, ctidx, yridx } = this.state;

    return (
      <Container>
        <Content>
          {active === 'home' &&
            <Home refer={this} items={carouselItems} />
          }
          {active === 'reps' &&
            <YourReps BundleId={BundleId} key={yridx} />
          }
          {active === 'canvassing' &&
            <CanvassingSetup navigation={this.props.navigation} refer={this} key={ctidx} />
          }
          {active === 'supporters' &&
            <Supporters refer={this} names={patreonNames} />
          }
          {active === 'legal' &&
            <Legal version={appVersion} refer={this} />
          }
        </Content>
        <Footer>
          <FooterTab>
            <Button active={(active === 'home'?true:false)} onPress={() => this.setState({active: 'home'})}>
              <Icon name="home" size={25} />
              <Text>{say("home")}</Text>
            </Button>
            <Button active={(active === 'reps'?true:false)} onPress={() => this.setState({active: 'reps', yridx: yridx+1})}>
              <Icon name="group" size={25} />
              <Text>{say("your_reps")}</Text>
            </Button>
            <Button active={(active === 'canvassing'?true:false)} onPress={() => this.setState({active: 'canvassing', ctidx: ctidx+1})}>
              <Icon name="map" size={25} />
              <Text>{say("canvassing")}</Text>
            </Button>
          </FooterTab>
        </Footer>
      </Container>
    );
  }
}
