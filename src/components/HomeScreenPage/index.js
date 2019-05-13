
import React, { PureComponent } from 'react';

import { Button, BottomNavigation } from 'react-native-material-ui'

import YourReps from '../YourRepsPage/index.js';
import CanvassingSetup from '../CanvassingSetupPage/index.js';

import {
  Alert,
  Dimensions,
  Image,
  TouchableOpacity,
  View,
  Text,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';

import Permissions from 'react-native-permissions';
import { _loginPing } from '../../common';

import Carousel, { Pagination } from 'react-native-snap-carousel';
import { sliderWidth, itemWidth } from '../../styles/SliderEntry.style';
import SliderEntry from '../SliderEntry';
import styles, { colors } from '../../styles/index.style';

const IS_ANDROID = Platform.OS === 'android';
const SLIDER_1_FIRST_ITEM = 1;

const MAIN_MENU = [
    {
        title: 'Get out the Vote!',
        subtitle: 'Voting is a basic civic duty. Just do it!',
        illustration: 'https://oldfirstucc.org/wp-content/uploads/2018/09/vote.jpg',
    },
    {
        title: 'Urban Canvassing',
        subtitle: 'Ideal even for canvassing in densely populated areas.',
        illustration: 'https://i.imgur.com/UPrs1EWl.jpg'
    },
    {
        title: 'Canvass Anywhere!',
        subtitle: 'Even if you don\'t have an internet connection, you can still canvass. Data uploads when you get home.',
        illustration: 'https://i.imgur.com/MABUbpDl.jpg',
    },
];

export default class App extends PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      active: 'home',
      carousel: [
        {title: 'test'},
        {title: 'test2'},
        {title: 'foo'},
        {title: 'bar'},
      ],
      slider1ActiveSlide: SLIDER_1_FIRST_ITEM,
    };
  }

  componentDidMount() {
    this.requestPushPermission();
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

    mainMenu (number, title) {
        const { slider1ActiveSlide } = this.state;

        return (
            <View style={styles.exampleContainer}>
                <Text style={styles.title}>{`Welcome to HelloVoter!`}</Text>
                <Text style={styles.subtitle}>{title}</Text>
                <Carousel
                  ref={c => this._slider1Ref = c}
                  data={MAIN_MENU}
                  renderItem={this._renderItemWithParallax}
                  sliderWidth={sliderWidth}
                  itemWidth={itemWidth}
                  hasParallaxImages={true}
                  firstItem={SLIDER_1_FIRST_ITEM}
                  inactiveSlideScale={0.94}
                  inactiveSlideOpacity={0.7}
                  containerCustomStyle={styles.slider}
                  contentContainerCustomStyle={styles.sliderContentContainer}
                  loop={true}
                  loopClonesPerSide={2}
                  autoplay={true}
                  autoplayDelay={500}
                  autoplayInterval={3000}
                  onSnapToItem={(index) => this.setState({ slider1ActiveSlide: index }) }
                />
                <Pagination
                  dotsLength={MAIN_MENU.length}
                  activeDotIndex={slider1ActiveSlide}
                  containerStyle={styles.paginationContainer}
                  dotColor={'rgba(255, 255, 255, 0.92)'}
                  dotStyle={styles.paginationDot}
                  inactiveDotColor={colors.black}
                  inactiveDotOpacity={0.4}
                  inactiveDotScale={0.6}
                  carouselRef={this._slider1Ref}
                  tappableDots={!!this._slider1Ref}
                />
            </View>
        );
    }

    render () {
      const menu = this.mainMenu(1, 'Phone Your Reps | Canvass at zero cost | Get Out The Vote!');

      const homeImage = require('../../../img/HomeScreen.png');

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
                directionalLockEnabled={true}
              >
                { menu }
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
