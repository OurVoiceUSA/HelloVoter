import React from 'react';

import {
  Text,
  TouchableOpacity,
} from 'react-native';

import { YellowBox } from 'react-native';
YellowBox.ignoreWarnings([
  'Warning: isMounted(...) is deprecated',
  'Module RCTImageLoader',
  'The StackNavigator function',
  'Class RCTCxxModule was not exported',
  'Require cycle:',
]);

import Icon from 'react-native-vector-icons/FontAwesome';

import HomeScreenPage from '../components/HomeScreenPage';
import PolProfilePage from '../components/PolProfilePage';
import SettingsPage from '../components/SettingsPage';
import CanvassingPage from '../components/CanvassingPage';
import ListMultiUnitPage from '../components/ListMultiUnitPage';
import SurveyPage from '../components/SurveyPage';
import CreateSurveyPage from '../components/CreateSurveyPage';
import LegacyCanvassingPage from '../components/LegacyCanvassingPage';
import LegacyCanvassingSettingsPage from '../components/LegacyCanvassingSettingsPage';
import LegacyListMultiUnitPage from '../components/LegacyListMultiUnitPage';
import LegacySurveyPage from '../components/LegacySurveyPage';

import { StackNavigator } from 'react-navigation';

import SettingsButton from './settings-button';

export default App = StackNavigator({
  HomeScreen: {
    screen: HomeScreenPage,
    navigationOptions: ({navigation}) => ({
      title: 'HelloVoter',
      headerRight: <SettingsButton nav={navigation} />,
    }),
  },
  Settings: {
    screen: SettingsPage,
    navigationOptions: ({navigation}) => ({
      title: 'Settings',
      headerLeft: null,
    }),
  },
  Canvassing: {
    screen: CanvassingPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing',
      headerLeft: <GoBack nav={navigation} />
    }),
  },
  ListMultiUnit: {
    screen: ListMultiUnitPage,
    navigationOptions: ({navigation}) => ({
      title: 'Units',
      headerLeft: null,
    }),
  },
  Survey: {
    screen: SurveyPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing Form',
      headerLeft: null,
    }),
  },
  PolProfile: {
    screen: PolProfilePage,
    navigationOptions: ({navigation}) => ({
      title: 'Politician Profile',
      headerRight: <SettingsButton nav={navigation} />,
      headerLeft: null,
    }),
  },
  LegacyCanvassingSettingsPage: {
    screen: LegacyCanvassingSettingsPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing Settings',
      headerLeft: null,
     }),
  },
  LegacyCanvassing: {
    screen: LegacyCanvassingPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing',
      headerLeft: <GoBack nav={navigation} />
    }),
  },
  LegacyListMultiUnit: {
    screen: LegacyListMultiUnitPage,
    navigationOptions: ({navigation}) => ({
      title: 'Units',
      headerLeft: null,
    }),
  },
  LegacySurvey: {
    screen: LegacySurveyPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing Form',
      headerLeft: null,
    }),
  },
  CreateSurvey: {
    screen: CreateSurveyPage,
    navigationOptions: ({navigation}) => ({
      title: `${navigation.state.params.title}`,
      headerLeft: null,
    }),
   },
});

const GoBack = (props) => (
  <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center'}} onPress={() => props.nav.goBack()}>
    <Icon name="times-circle" size={30} style={{marginLeft: 10, margin: 5}} />
    <Text>Exit</Text>
  </TouchableOpacity>
);
