import React from "react";
import { Text } from 'react-native';
import { Root, Content } from "../components/Layout";
import { Button } from "../components/Buttons";

import { Link } from '../App/routing';

import NativeCanvassing from '../App/Native/map';

export const Canvassing = ({ navigation }) => {
  return (
    <NativeCanvassing />
  );
};
