import React from 'react';

import HomeScreenPage from '../components/HomeScreenPage';
import YourRepsPage from '../components/YourRepsPage';
import PolProfilePage from '../components/PolProfilePage';
import SettingsPage from '../components/SettingsPage';
import CanvassingPage from '../components/CanvassingPage';
import SurveyPage from '../components/SurveyPage';
import AboutPage from '../components/AboutPage';

import { StackNavigator } from 'react-navigation';

import HelpButton from './help-button';

export default App = StackNavigator({
  HomeScreen: {
    screen: HomeScreenPage,
    navigationOptions: ({navigation}) => ({
      title: 'OurVoice',
      headerBackTitle: ' ',
      headerTruncatedBackTitle: ' ',
    }),
  },
    Settings: {
      screen: SettingsPage,
      navigationOptions: ({navigation}) => ({
        title: 'Your Voice',
      }),
    },
    PoliticalViews: {
      screen: SurveyPage,
      navigationOptions: ({navigation}) => {
        const { setParams } = navigation;
        return ({
          title: 'Your Political Views',
          headerRight: <HelpButton onPress={() => setParams({isHelpModalVisible: true})} />,
        });
      },
    },
    Canvassing: {
      screen: CanvassingPage,
      navigationOptions: ({navigation}) => ({
        title: 'Canvassing',
      }),
    },
      Survey: {
        screen: SurveyPage,
        navigationOptions: ({navigation}) => ({
          title: 'Survey',
        }),
      },
    YourReps: {
      screen: YourRepsPage,
      navigationOptions: ({navigation}) => ({
        title: 'Your Representatives',
      }),
    },
    PolProfile: {
      screen: PolProfilePage,
      navigationOptions: ({navigation}) => ({
        title: 'Politician Profile',
      }),
    },
  About: {
    screen: AboutPage,
    navigationOptions: ({navigation}) => ({
      title: 'About Our Voice',
    }),
  },
});
