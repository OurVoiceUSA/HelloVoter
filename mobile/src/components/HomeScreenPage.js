
import React from 'react';
import HVComponent from './HVComponent';

import { BottomNavigation, Button } from 'react-native-material-ui';

import YourReps from './YourRepsPage';
import CanvassingSetup from './CanvassingSetupPage';

import {
  View,
  Text,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';

import Permissions from 'react-native-permissions';
import { getLocales } from 'react-native-localize';
import Icon from 'react-native-vector-icons/FontAwesome';
import Rate, { AndroidMarket } from 'react-native-rate'
import Carousel, { Pagination } from 'react-native-snap-carousel';
import storage from 'react-native-storage-wrapper';
import DeviceInfo from 'react-native-device-info';

import { sliderWidth, itemWidth } from '../styles/SliderEntry.style';
import styles, { colors } from '../styles/index.style';
import SliderEntry from './SliderEntry';
import { _loginPing, translate } from '../common';

export default class App extends HVComponent {

  constructor(props) {
    super(props);

    let mainMenu = [];
    let lang;

    try {
      lang = getLocales().shift().languageCode;
    } catch (e) {
      lang = "en";
      console.warn(e);
    };

    // non-english sees translation card first
    if (lang !== "en")
    mainMenu.push(
      {
        title: translate("we_translated_this"),
        subtitle: translate("we_used_google_translate"),
        illustration: require('../../img/translate.png'),
        onPress: () => this.openGitHub(),
      }
    );

    mainMenu.push(
      {
        title: translate("contact_your_reps"),
        subtitle: translate("know_who_represents_you"),
        illustration: require('../../img/phone-your-rep.png'),
        onPress: () => this.setState({active: 'reps'}),
      }
    );

    mainMenu.push(
      {
        title: translate("canvas_for_any_cause"),
        subtitle: translate("our_zero_cost_tool"),
        illustration: require('../../img/canvassing.png'),
        onPress: () => this.setState({active: 'canvassing'}),
      }
    );

    // since non-english got an extra card, need to swap one out to keep the count even
    if (lang === "en")
    mainMenu.push(
      {
        title: translate("coming_zoon_desktop_tools"),
        subtitle: translate("canvassing_at_scale"),
        illustration: require('../../img/phone-banking.png'),
        onPress: () => this.openDonate(),
      }
    );

    mainMenu.push(
      {
        title: translate("donate"),
        subtitle: translate("we_operate_on_donations"),
        illustration: require('../../img/donate.png'),
        onPress: () => this.openDonate(),
      }
    );

    mainMenu.push(
      {
        title: translate("rate_this_app"),
        subtitle: translate("feedback_helps_us"),
        illustration: require('../../img/rate.png'),
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
      }
    );

    mainMenu.push(
      {
        title: translate("open_source_software"),
        subtitle: translate("help_us_out_directly"),
        illustration: require('../../img/open-source.png'),
        onPress: () => this.openGitHub(),
      }
    );

    this.state = {
      active: 'home',
      mainMenu,
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
    this.checkForInvite();
  }

  requestPushPermission = async () => {
    try {
      res = await Permissions.request('notification');
    } catch(error) {
      // nothing we can do about it
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

  render () {
    const { active, mainMenu, sliderActiveSlide } = this.state;

    return (
      <View style={styles.safeArea}>
        <StatusBar />
        {active === 'home' &&
          <View style={styles.container}>
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
            </View>
            <Text style={styles.homeScreenText}>{translate("homescreen_summary")}</Text>
            <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
              <Icon name="facebook-official" size={40} color="#3b5998" style={{marginRight: 25}} onPress={this.openFacebook} />
              <Icon name="twitter" size={40} color="#0084b4" style={{marginRight: 25}} onPress={this.openTwitter} />
              <Icon name="youtube-play" size={40} color="#ff0000" style={{marginRight: 25}} onPress={this.openYouTube} />
              <Icon name="github" size={40} style={{marginRight: 25}} onPress={() => {this.openGitHub(null)}} />
              <Icon name="globe" size={40} color="#008080" onPress={this.openWebsite} />
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'center'}}>
              <Button raised primary text={translate("legal_notice")} onPress={() => this.setState({active: 'legal'})} />
            </View>

          </ScrollView>
        </View>
        }
        {active === 'reps' &&
          <YourReps navigation={this.props.navigation} />
        }
        {active === 'canvassing' &&
          <CanvassingSetup navigation={this.props.navigation} refer={this} />
        }
        {active === 'legal' &&
        <View style={styles.container}>
          <ScrollView style={styles.scrollview}>
            <Text style={styles.homeScreenText}>
              HelloVoter Version {DeviceInfo.getVersion()}
            </Text>
            <Text style={styles.homeScreenText}>
              Copyright (c) 2018, Our Voice USA. {translate("all_rights_reserved")}
            </Text>
            <Text style={styles.homeScreenText}>{translate("this_program_is_free_software")}</Text>
            <AppleEULA />
            <View style={{flexDirection: 'row', justifyContent: 'center'}}>
              <Button raised primary text={translate("tap_here_for_source_code")} onPress={() => this.openGitHub('HelloVoter')} />
            </View>
          </ScrollView>
        </View>
        }

        <BottomNavigation active={this.state.active} hidden={false} >
          <BottomNavigation.Action
            key="home"
            icon="home"
            label={translate("home")}
            onPress={() => this.setState({ active: 'home' })}
          />
          <BottomNavigation.Action
            key="reps"
            icon="people"
            label={translate("your_reps")}
            onPress={() => this.setState({ active: 'reps' })}
          />
          <BottomNavigation.Action
            key="canvassing"
            icon="map"
            label={translate("canvassing")}
            onPress={() => this.setState({ active: 'canvassing' })}
          />
        </BottomNavigation>

      </View>
    );
  }
}

const AppleEULA = props => {
  if (Platform.OS === 'ios') return (
    <Text style={styles.homeScreenText}>{translate("note_about_apple_eula")}</Text>
  );
  return null;
};

