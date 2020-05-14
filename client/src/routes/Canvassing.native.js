import React from 'react';
import { Text } from 'react-native';

import { Root, Content } from '../components/Layout';
import { Button } from '../components/Buttons';
import NativeCanvassing from '../Native/map';
import { Link } from '../lib/routing';

export const Canvassing = ({ navigation }) => {
  return (
    <NativeCanvassing />
  );
};
