import React from 'react';

import { YellowBox } from 'react-native';
YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader', 'The StackNavigator function']);

import HomeScreenPage from '../components/HomeScreenPage';
import YourRepsPage from '../components/YourRepsPage';
import PolProfilePage from '../components/PolProfilePage';
import SettingsPage from '../components/SettingsPage';
import CanvassingSetupPage from '../components/CanvassingSetupPage';
import CanvassingSettingsPage from '../components/CanvassingSettingsPage';
import CanvassingPage from '../components/CanvassingPage';
import ListMultiUnitPage from '../components/ListMultiUnitPage';
import SurveyPage from '../components/SurveyPage';
import CreateSurveyPage from '../components/CreateSurveyPage';
import AboutPage from '../components/AboutPage';

import { StackNavigator } from 'react-navigation';

import SettingsButton from './settings-button';

export default App = StackNavigator({
  HomeScreen: {
    screen: HomeScreenPage,
    navigationOptions: ({navigation}) => ({
      title: 'OurVoice',
      headerBackTitle: ' ',
      headerTruncatedBackTitle: ' ',
      headerRight: <SettingsButton nav={navigation} />,
    }),
  },
  Settings: {
    screen: SettingsPage,
    navigationOptions: ({navigation}) => ({
      title: 'Settings',
    }),
  },
  CanvassingSetup: {
    screen: CanvassingSetupPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing Setup',
     }),
  },
  CanvassingSettingsPage: {
    screen: CanvassingSettingsPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing Settings',
     }),
  },
  Canvassing: {
    screen: CanvassingPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing',
    }),
  },
  ListMultiUnit: {
    screen: ListMultiUnitPage,
    navigationOptions: ({navigation}) => ({
      title: 'Units',
    }),
  },
  Survey: {
    screen: SurveyPage,
    navigationOptions: ({navigation}) => ({
      title: 'Canvassing Form',
    }),
  },
  CreateSurvey: {
    screen: CreateSurveyPage,
    navigationOptions: ({navigation}) => ({
      title: 'Create Form',
    }),
   },
  YourReps: {
    screen: YourRepsPage,
    navigationOptions: ({navigation}) => ({
      title: 'Your Representatives',
      headerRight: <SettingsButton nav={navigation} />,
    }),
  },
  PolProfile: {
    screen: PolProfilePage,
    navigationOptions: ({navigation}) => ({
      title: 'Politician Profile',
      headerRight: <SettingsButton nav={navigation} />,
    }),
  },
  About: {
    screen: AboutPage,
    navigationOptions: ({navigation}) => ({
      title: 'About Our Voice',
      headerRight: <SettingsButton nav={navigation} />,
    }),
  },
});
