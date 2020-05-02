import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";

import * as React from "react";

import TabBarIcon from "../components/TabBarIcon";
import HomeScreen from "../screens/HomeScreen";
import LinksScreen from "../screens/LinksScreen";
import { CampaignScreen } from "../screens/campaign/CampaignScreen";
import { PostcardScreen } from "../screens/campaign/PostcardScreen";
import { PhoneBankScreen } from "../screens/campaign/PhoneBankScreen";
import { InCallScreen } from "../screens/campaign/InCallScreen";
import { KnockDoorScreen } from "../screens/campaign/KnockDoorScreen";

const BottomTab = createBottomTabNavigator();
const INITIAL_ROUTE_NAME = "Home";

const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Campaign"
        component={CampaignScreen}
        options={(props) => ({
          title: props.route.params.campaignTitle,
        })}
      />
      <Stack.Screen
        name="PhoneBank"
        component={PhoneBankScreen}
        options={(props) => ({
          title: props.route.params.campaignTitle,
        })}
      />
      <Stack.Screen
        name="InCall"
        component={InCallScreen}
        options={(props) => ({
          title: props.route.params.campaignTitle,
        })}
      />
      <Stack.Screen
        name="Postcard"
        component={PostcardScreen}
        options={(props) => ({
          title: props.route.params.campaignTitle,
        })}
      />
      <Stack.Screen
        name="KnockDoor"
        component={KnockDoorScreen}
        options={(props) => ({
          title: props.route.params.campaignTitle,
        })}
      />
    </Stack.Navigator>
  );
}

export default function BottomTabNavigator({ navigation, route }) {
  // Set the header title on the parent stack navigator depending on the
  // currently active tab. Learn more in the documentation:
  // https://reactnavigation.org/docs/en/screen-options-resolution.html
  //navigation.setOptions({ headerTitle: getHeaderTitle(route) });

  return (
    <BottomTab.Navigator initialRouteName={INITIAL_ROUTE_NAME}>
      <BottomTab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} name="md-code-working" />
          ),
        }}
      />
      <BottomTab.Screen
        name="Links"
        component={LinksScreen}
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} name="md-book" />
          ),
        }}
      />
    </BottomTab.Navigator>
  );
}

function getHeaderTitle(route) {
  const routeName =
    route.state?.routes[route.state.index]?.name ?? INITIAL_ROUTE_NAME;

  switch (routeName) {
    case "Home":
      return "How to get started with cats";
    case "Links":
      return "Links to learn more";
  }
}
