
import React, { PureComponent } from 'react';

import { Button, BottomNavigation } from 'react-native-material-ui'

import YourReps from '../YourRepsPage/index.js';
import CanvassingSetup from '../CanvassingSetupPage/index.js';

import {
  Alert,
  Image,
  TouchableOpacity,
  View,
  Text,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';

import Permissions from 'react-native-permissions';
import { _loginPing } from '../../common';

import Icon from 'react-native-vector-icons/FontAwesome';
import Rate, { AndroidMarket } from 'react-native-rate'
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { sliderWidth, itemWidth } from '../../styles/SliderEntry.style';
import SliderEntry from '../SliderEntry';
import styles, { colors } from '../../styles/index.style';

export default class App extends PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      active: 'home',
      mainMenu: [],
      sliderActiveSlide: 0,
    };
  }

  openFacebook = () => this.openURL('https://m.facebook.com/OurVoiceUsa');
  openTwitter = () => this.openURL('https://twitter.com/OurVoiceUsa');
  openYouTube = () => this.openURL('https://www.youtube.com/channel/UCw5fpnK-IZVQ4IkYuapIbiw');
  openWebsite = () => this.openURL('https://ourvoiceusa.org/');
  openGitHub = (repo) => this.openURL('https://github.com/OurVoiceUSA/'+(repo?repo:''));
  openDonate = () => this.openURL('https://secure.givelively.org/donate/our-voice-usa');

  openURL = (url) => {
    return Linking.openURL(url).catch(() => null);
  }

  componentDidMount() {
    this.requestPushPermission();

    // TODO: default to local file but attempt to pull latest from web resource
    this.setState({mainMenu: [
      {
        title: 'Coming soon; Phone Banking',
        subtitle: 'Be kind to your feet and connect to voters from the comfort of your home.',
        illustration: 'https://oldfirstucc.org/wp-content/uploads/2018/09/vote.jpg',
        onPress: () => this.openDonate(),
      },
      {
        title: 'Donate',
        subtitle: 'We operate on donations. Keep this app free by making a contribution today.',
        illustration: 'https://i.imgur.com/MABUbpDl.jpg',
        onPress: () => this.openDonate(),
      },
      {
        title: 'Rate this App!',
        subtitle: 'Feedback helps us make this app better. Share your experience with the world.',
        illustration: 'https://i.imgur.com/MABUbpDl.jpg',
        onPress: () => {
          let options = {
            AppleAppID: "1275301651",
            GooglePackageName: "org.ourvoiceinitiative.ourvoice",
            preferredAndroidMarket: AndroidMarket.Google,
            preferInApp: false,
            openAppStoreIfInAppFails: true,
          }
          Rate.rate(options, (success) => {});
        },
      },
      {
        title: 'Open Source Software',
        subtitle: 'You can help us out directly! Contribute art, how-to\'s, or write code. The power is yours.',
        illustration: 'https://i.imgur.com/UPrs1EWl.jpg',
        onPress: () => this.openGitHub(),
      },
    ]
  });

  }

  requestPushPermission = async () => {
    try {
      res = await Permissions.request('notification');
    } catch(error) {
      // nothing we can do about it
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

  render () {
    const { mainMenu, sliderActiveSlide } = this.state;

    return (
      <SafeAreaView style={styles.safeArea}>
        {this.state.active === 'home' &&
          <View style={styles.container}>
            <StatusBar
              translucent={true}
              backgroundColor={'rgba(0, 0, 0, 0)'}
              barStyle={'light-content'}
              />
           <ScrollView
              style={styles.scrollview}
              scrollEventThrottle={200}
              directionalLockEnabled={true}>
            <View style={styles.exampleContainer}>
              <Carousel
                ref={c => this._sliderRef = c}
                data={mainMenu}
                renderItem={this._renderItemWithParallax}
                sliderWidth={sliderWidth}
                itemWidth={itemWidth}
                hasParallaxImages={true}
                firstItem={0}
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
            </View>
            <Text style={{marginTop: 0, margin: 15, color: 'dimgray'}}>
              Our Voice USA, the maker of HelloVoter, is a non-partisan organization registered as a 501(c)(3)
              non-profit charity. We provide access to tools, resources, and collaboration that
              enables every day people to be politically engaged. Check us out on social media!
            </Text>
            <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
              <Icon name="facebook-official" size={40} color="#3b5998" style={{marginRight: 25}} onPress={this.openFacebook} />
              <Icon name="twitter" size={40} color="#0084b4" style={{marginRight: 25}} onPress={this.openTwitter} />
              <Icon name="youtube-play" size={40} color="#ff0000" style={{marginRight: 25}} onPress={this.openYouTube} />
              <Icon name="github" size={40} style={{marginRight: 25}} onPress={() => {this.openGitHub(null)}} />
              <Icon name="globe" size={40} color="#008080" onPress={this.openWebsite} />
            </View>
          </ScrollView>
        </View>
        }
        {this.state.active === 'reps' &&
          <YourReps navigation={this.props.navigation} />
        }
        {this.state.active === 'canvassing' &&
          <CanvassingSetup navigation={this.props.navigation} />
        }

        <BottomNavigation active={this.state.active} hidden={false} >
          <BottomNavigation.Action
            key="home"
            icon="home"
            label="Home"
            onPress={() => this.setState({ active: 'home' })}
          />
          <BottomNavigation.Action
            key="reps"
            icon="people"
            label="Your Reps"
            onPress={() => this.setState({ active: 'reps' })}
          />
          <BottomNavigation.Action
            key="canvassing"
            icon="map"
            label="Canvassing"
            onPress={() => this.setState({ active: 'canvassing' })}
          />
        </BottomNavigation>

      </SafeAreaView>
    );
  }
}

