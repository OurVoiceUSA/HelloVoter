import React from 'react';

import {
  Text,
  TouchableOpacity,
  View,
  Image,
  YellowBox,
} from 'react-native';

YellowBox.ignoreWarnings([
  'animateCamera',
  'RNCNetInfo - You are', // my fire, my one desire! (not)
  'Warning: isMounted(...) is deprecated',
  'componentWillReceiveProps is deprecated',
  'componentWillMount is deprecated',
  'Module RCTImageLoader',
  'The StackNavigator function',
  'Class RCTCxxModule was not exported',
  'Require cycle:',
  'Task orphaned for request <NSMutableURLRequest: ',
]);

import Icon from 'react-native-vector-icons/FontAwesome';

import HomeScreenPage from '../components/HomeScreenPage';
import InvitePage from '../components/InvitePage';
import PolProfilePage from '../components/PolProfilePage';
import SettingsPage from '../components/SettingsPage';
import CanvassingPage from '../components/CanvassingPage';
import SurveyPage from '../components/SurveyPage';
import CreateSurveyPage from '../components/CreateSurveyPage';
import LegacyCanvassingPage from '../components/LegacyCanvassingPage';
import LegacyCanvassingSettingsPage from '../components/LegacyCanvassingSettingsPage';
import LegacyListMultiUnitPage from '../components/LegacyListMultiUnitPage';
import LegacySurveyPage from '../components/LegacySurveyPage';

import { createStackNavigator, createAppContainer } from 'react-navigation';

import SettingsButton from './settings-button';

const AppNavigator = createStackNavigator({
  HomeScreen: {
    screen: HomeScreenPage,
    navigationOptions: ({navigation}) => ({
      headerTitle: (
        <View style={{flex:1, flexDirection:'row', justifyContent:'center'}}>
          <Text style={{fontSize:20}}>HelloVoter</Text>
          <Image
            source={require("../../img/OVlogo.png")}
            style={{width:25, height:25, marginLeft: 15}}
          />
        </View>
      ),
      headerRight: (<SettingsButton nav={navigation} />),
    }),
  },
  Invite: {
    screen: InvitePage,
    navigationOptions: ({navigation}) => ({
      title: 'Invited',
      headerLeft: null,
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
      headerLeft: (<GoBack nav={navigation} />),
      gesturesEnabled: false,
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
      headerRight: (<SettingsButton nav={navigation} />),
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
      headerLeft: (<GoBack nav={navigation} />),
      gesturesEnabled: false,
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

export default createAppContainer(AppNavigator);
