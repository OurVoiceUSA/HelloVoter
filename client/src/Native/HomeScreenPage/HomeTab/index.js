import React from 'react';
import { View } from 'react-native';
import { Text, Button, Spinner } from 'native-base';

import Carousel, { Pagination } from 'react-native-snap-carousel';
import SliderEntry from './SliderEntry';
import { sliderWidth, itemWidth } from './SliderEntry.style';
import styles, { colors } from '../../styles/index.style';
import Icon from 'react-native-vector-icons/FontAwesome';

import { say, openURL, openGitHub } from '../../common';

function _renderItemWithParallax ({item, index}, parallaxProps) {
  return (
    <SliderEntry
      data={item}
      even={(index + 1) % 2 === 0}
      parallax={true}
      parallaxProps={parallaxProps}
    />
  );
}

export default HomeTab = props => (
  <View style={{padding: 15}}>
    <Carousel
      ref={c => props.refer._sliderRef = c}
      data={props.items}
      renderItem={_renderItemWithParallax}
      sliderWidth={sliderWidth}
      itemWidth={itemWidth}
      hasParallaxImages={true}
      firstItem={props.refer.state.sliderActiveSlide}
      inactiveSlideScale={0.94}
      inactiveSlideOpacity={0.7}
      containerCustomStyle={styles.slider}
      contentContainerCustomStyle={styles.sliderContentContainer}
      loop={true}
      loopClonesPerSide={2}
      autoplay={true}
      autoplayDelay={500}
      autoplayInterval={5000}
      onSnapToItem={(index) => props.refer.setState({ sliderActiveSlide: index }) }
    />
    <Pagination
      dotsLength={props.items.length}
      activeDotIndex={props.refer.state.sliderActiveSlide}
      containerStyle={styles.paginationContainer}
      dotColor={'rgba(55, 55, 55, 0.92)'}
      dotStyle={styles.paginationDot}
      inactiveDotColor={colors.black}
      inactiveDotOpacity={0.4}
      inactiveDotScale={0.6}
      carouselRef={props.refer._sliderRef}
      tappableDots={!!props.refer._sliderRef}
    />


    <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
      <Button primary onPress={() => props.refer.setState({active: 'supporters'})}><Text>{say("app_supporters")}</Text></Button>
      <Text>{'  '}</Text>
      <Button primary onPress={() => props.refer.setState({active: 'legal'})}><Text>{say("legal_notice")}</Text></Button>
    </View>
  </View>
);
