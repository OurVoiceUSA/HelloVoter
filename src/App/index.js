import React from 'react';

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
      headerBackTitle: 'Back',
      headerRight: <SettingsButton nav={navigation} />,
    }),
  },
  Settings: {
    screen: SettingsPage,
    navigationOptions: ({navigation}) => ({
      title: 'Settings',
    }),
  },
  Canvassing: {
    screen: CanvassingPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing',
      headerLeft: <Icon name="times-circle" size={30} style={{marginLeft: 10, margin: 5}} onPress={() => navigation.goBack()} />
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
    }),
  },
  PolProfile: {
    screen: PolProfilePage,
    navigationOptions: ({navigation}) => ({
      title: 'Politician Profile',
      headerRight: <SettingsButton nav={navigation} />,
    }),
  },
  LegacyCanvassingSettingsPage: {
    screen: LegacyCanvassingSettingsPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing Settings',
     }),
  },
  LegacyCanvassing: {
    screen: LegacyCanvassingPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing',
    }),
  },
  LegacyListMultiUnit: {
    screen: LegacyListMultiUnitPage,
    navigationOptions: ({navigation}) => ({
      title: 'Units',
    }),
  },
  LegacySurvey: {
    screen: LegacySurveyPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing Form',
    }),
  },
  CreateSurvey: {
    screen: CreateSurveyPage,
    navigationOptions: ({navigation}) => ({
      title: `${navigation.state.params.title}`,
    }),
   },
});
