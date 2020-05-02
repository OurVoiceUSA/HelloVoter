import * as React from "react";
import { View, TouchableOpacity, Linking, Platform, AsyncStorage } from "react-native";
import * as WebBrowser from 'expo-web-browser';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { colors } from "./src/colors";
import Icon from "react-native-vector-icons/FontAwesome";
import { SettingsScreen, HelpScreen, LoginScreen } from "./src/screens";
import { CampaignScreen, YourCampaignsScreen } from "./src/screens/campaign";
import { PostcardScreen } from "./src/screens/campaign/postcard";
import {
  PhoneBankScreen,
  InCallScreen,
} from "./src/screens/campaign/phonebank";
import { KnockDoorScreen } from "./src/screens/campaign/canvassing";

import * as RootNavigation from './RootNavigation.js';

const Stack = createStackNavigator();

const defaultHeaderStyle = {
  headerStyle: {
    backgroundColor: colors.brand,
  },
  headerTintColor: "#fff",
  headerTitleStyle: {
    fontWeight: "bold",
  },
};

const defaultOptions = ({ navigation, title }) => ({
  title: title,
  headerLeft: () => (
    <View style={{ marginLeft: 10 }}>
      <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
        <Icon name="bars" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  ),
  drawerIcon: ({ tintColor }) => <Icon name="bars" size={24} color="#fff" />,
  ...defaultHeaderStyle,
});

const noMenuOptions = ({ navigation, title }) => ({
  title: title,
  ...defaultHeaderStyle,
});

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={({ navigation }) =>
          noMenuOptions({ navigation, title: "Hello Voter" })
        }
      />
      <Stack.Screen
        name="Dashboard"
        component={YourCampaignsScreen}
        options={({ navigation }) =>
          defaultOptions({ navigation, title: "Your Campaigns" })
        }
      />
      <Stack.Screen
        name="Campaign"
        component={CampaignScreen}
        options={({ navigation, route }) =>
          defaultOptions({ navigation, title: route.params.campaignTitle })
        }
      />
      <Stack.Screen
        name="Postcard"
        component={PostcardScreen}
        options={({ navigation, route }) =>
          defaultOptions({ navigation, title: route.params.campaignTitle })
        }
      />
      <Stack.Screen
        name="InCall"
        component={InCallScreen}
        options={({ navigation, route }) =>
          defaultOptions({ navigation, title: route.params.campaignTitle })
        }
      />
      <Stack.Screen
        name="PhoneBank"
        component={PhoneBankScreen}
        options={({ navigation, route }) =>
          defaultOptions({ navigation, title: route.params.campaignTitle })
        }
      />
      <Stack.Screen
        name="KnockDoor"
        component={KnockDoorScreen}
        options={({ navigation, route }) =>
          defaultOptions({ navigation, title: route.params.campaignTitle })
        }
      />
    </Stack.Navigator>
  );
}

function HelpStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={defaultOptions}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={defaultOptions}
      />
    </Stack.Navigator>
  );
}

function LogoutStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Logout"
        component={LoginScreen}
        options={({ navigation }) =>
          noMenuOptions({ navigation, title: "Hello Voter" })
        }
     />
    </Stack.Navigator>
  );
}

const Drawer = createDrawerNavigator();

async function fetchFromStorage (key) {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value
    }
  } catch (error) {
    // Error retrieving data
    console.log('error retrieving data: ', error);
  }
}

async function saveToStorage (key, value) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    // Error saving data
    console.log('error saving data: ', error);
  }
}

class App extends React.Component {

  constructor() {
    super();

    this.state = {
      token: null,
    };
  }

  async componentDidMount() {
    let token

    this.setState({ token: await fetchFromStorage('jwt') })

    if (this.state.token) {
      console.log('this.state.token: ', this.state.token);
      RootNavigation.navigate('Dashboard');
      return
    }

    if (Platform.OS === 'web') {
      try {
        if (window.location.href.match(/\/jwt\//)) {
          token = window.location.href.split('/').pop();
          console.log('got token: ', token);
          if (token) {
            await saveToStorage('jwt', token);
            RootNavigation.navigate('Dashboard');
          }
        }
      } catch(e) {
        console.warn(e);
      }
    } else {
      // Add event listener to handle OAuthLogin:// URLs
      Linking.addEventListener('url', handleOpenURL);
      // Launched from an external URL
      Linking.getInitialURL().then((url) => {
        if (url) {
          handleOpenURL({ url });
        }
      });
    }
  }

  render() {
    const getDrawerIcon = (focused, size, name) => (
      <Icon
        color={focused ? colors.midGrey : colors.brand}
        size={size}
        name={name}
      />
    );
    return (
      <NavigationContainer ref={navigationRef}>
        <Drawer.Navigator initialRouteName="Dashboard">
          <Drawer.Screen
            name="Dashboard"
            component={HomeStack}
            options={{
              drawerIcon: ({ focused, size }) =>
                getDrawerIcon(focused, size, "th-large"),
            }}
          />
          <Drawer.Screen
            name="Settings"
            component={SettingsStack}
            options={{
              drawerIcon: ({ focused, size }) =>
                getDrawerIcon(focused, size, "cog"),
            }}
          />
          <Drawer.Screen
            name="Help"
            component={HelpStack}
            options={{
              drawerIcon: ({ focused, size }) =>
                getDrawerIcon(focused, size, "question"),
            }}
          />
          <Drawer.Screen
            name="Logout"
            component={LogoutStack}
            options={{
              drawerIcon: ({ focused, size }) =>
                getDrawerIcon(focused, size, "sign-out"),
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
    );
  }
}

const handleOpenURL = async ({ url }) => {
  // Extract jwt token out of the URL
  const m = url.match(/jwt=([^#]+)/);

  if (m) {
    await saveToStorage('jwt', m[1]);
    RootNavigation.navigate('Dashboard');
  }

  if (Platform.OS === 'ios') {
    WebBrowser.dismissBrowser();
  }
};


export default App;
