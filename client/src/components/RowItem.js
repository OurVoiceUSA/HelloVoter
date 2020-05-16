import * as React from "react";
import { TouchableOpacity, Platform, styled } from '../lib/react-native';

import { MediumText } from "../components/Type";
import { colors } from "../colors";

// for some mysterious reason, this was necessary in RowItem but not in Layout.

const viewOrDiv = Platform.OS === "web" ? styled.div : styled.View;

const RowItemStyle = viewOrDiv`
  justify-content: center;
  align-items: center;
  border: 1px ${colors.alt} solid;
  padding: 10px;
  margin: 5px;
`;

export const RowItem = (props) => (
  <TouchableOpacity onPress={props.onPress}>
    <RowItemStyle>
      <MediumText>{props.text}</MediumText>
    </RowItemStyle>
  </TouchableOpacity>
);
