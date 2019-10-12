
import React from 'react';
import HVComponent from '../HVComponent';

import YourReps from './YourReps';
import CanvassingSetup from './CanvassingSetup';
import Supporters from './Supporters';
import Legal from './Legal';
import { carouselItems } from './CarouselItems';

import {
  View,
  Platform,
} from 'react-native';

import { Container, Header, Content, Footer, FooterTab, Text, Button, Spinner } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import storage from 'react-native-storage-wrapper';

import { sliderWidth, itemWidth } from '../styles/SliderEntry.style';
import styles, { colors } from '../styles/index.style';
import SliderEntry from '../SliderEntry';
import { say, DINFO, permissionNotify, openURL } from '../common';

export default class App extends HVComponent {

  constructor(props) {
    super(props);

    this.state = {
      active: 'home',
      appVersion: "unknown",
      mainMenu: carouselItems(this),
      sliderActiveSlide: 0,
      patreonNames: [],
    };
  }

  openFacebook = () => openURL('https://m.facebook.com/OurVoiceUsa');
  openTwitter = () => openURL('https://twitter.com/OurVoiceUsa');
  openYouTube = () => openURL('https://www.youtube.com/channel/UCw5fpnK-IZVQ4IkYuapIbiw');
  openWebsite = () => openURL('https://ourvoiceusa.org/');
  openGitHub = (repo) => openURL('https://github.com/OurVoiceUSA/'+(repo?repo:''));
  openDonate = () => openURL('https://www.patreon.com/join/hellovoter');

  componentDidMount() {
    this.loadPatreonNames();
    permissionNotify();
    this.checkForInvite();
    DINFO().then(i => this.setState({appVersion: i.Version})).catch(e => console.warn(e));
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

  _renderItem ({item, index}) {
    return <SliderEntry data={item} even={(index + 1) % 2 === 0} />;
  }

  _renderItemWithParallax ({item, index}, parallaxProps) {
    return (
      <SliderEntry
        data={item}
        even={(index + 1) % 2 === 0}
        parallax={true}
        parallaxProps={parallaxProps}
      />
    );
  }

  _renderLightItem ({item, index}) {
    return <SliderEntry data={item} even={false} />;
  }

  _renderDarkItem ({item, index}) {
    return <SliderEntry data={item} even={true} />;
  }

  render() {
    const { active, appVersion, mainMenu, sliderActiveSlide, patreonNames } = this.state;

    return (
      <Container>
        <Content padder>
          {active === 'home' &&
          <View>
            <Carousel
              ref={c => this._sliderRef = c}
              data={mainMenu}
              renderItem={this._renderItemWithParallax}
              sliderWidth={sliderWidth}
              itemWidth={itemWidth}
              hasParallaxImages={true}
              firstItem={this.state.sliderActiveSlide}
              inactiveSlideScale={0.94}
              inactiveSlideOpacity={0.7}
              containerCustomStyle={styles.slider}
              contentContainerCustomStyle={styles.sliderContentContainer}
              loop={true}
              loopClonesPerSide={2}
              autoplay={true}
              autoplayDelay={500}
              autoplayInterval={5000}
              onSnapToItem={(index) => this.setState({ sliderActiveSlide: index }) }
            />
            <Pagination
              dotsLength={mainMenu.length}
              activeDotIndex={sliderActiveSlide}
              containerStyle={styles.paginationContainer}
              dotColor={'rgba(55, 55, 55, 0.92)'}
              dotStyle={styles.paginationDot}
              inactiveDotColor={colors.black}
              inactiveDotOpacity={0.4}
              inactiveDotScale={0.6}
              carouselRef={this._sliderRef}
              tappableDots={!!this._sliderRef}
            />

            <Text>{say("homescreen_summary")}</Text>
            <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
              <Icon name="facebook-official" size={40} color="#3b5998" style={{marginRight: 25}} onPress={this.openFacebook} />
              <Icon name="twitter" size={40} color="#0084b4" style={{marginRight: 25}} onPress={this.openTwitter} />
              <Icon name="youtube-play" size={40} color="#ff0000" style={{marginRight: 25}} onPress={this.openYouTube} />
              <Icon name="github" size={40} style={{marginRight: 25}} onPress={() => {this.openGitHub(null)}} />
              <Icon name="globe" size={40} color="#008080" onPress={this.openWebsite} />
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
              <Button primary onPress={() => this.setState({active: 'supporters'})}><Text>{say("app_supporters")}</Text></Button>
              <Text>{'  '}</Text>
              <Button primary onPress={() => this.setState({active: 'legal'})}><Text>{say("legal_notice")}</Text></Button>
            </View>
          </View>
        }
        {active === 'reps' &&
          <YourReps navigation={this.props.navigation} />
        }
        {active === 'canvassing' &&
          <CanvassingSetup navigation={this.props.navigation} refer={this} />
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
            <Button active={(active === 'reps'?true:false)} onPress={() => this.setState({active: 'reps'})}>
              <Icon name="group" size={25} />
              <Text>{say("your_reps")}</Text>
            </Button>
            <Button active={(active === 'canvassing'?true:false)} onPress={() => this.setState({active: 'canvassing'})}>
              <Icon name="map" size={25} />
              <Text>{say("canvassing")}</Text>
            </Button>
          </FooterTab>
        </Footer>
      </Container>
    );
  }
}
