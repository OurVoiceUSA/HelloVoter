import {
  ActivityIndicator, Linking, Platform, Text, TouchableOpacity, View,
  YellowBox,
} from 'react-native';
import styled, { css } from 'styled-components/native';
import SideMenu from 'react-native-side-menu';

YellowBox.ignoreWarnings([
  'SideMenu', // waiting for upstream fix to componentWillMount, etc
]);

export {
  ActivityIndicator, Linking, Platform, Text, TouchableOpacity, View,
  SideMenu, styled, css
};
