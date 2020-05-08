import * as React from "react";
import { colors } from "../colors";
import { TouchableOpacity, Platform } from "react-native";
import styled from "styled-components/native";
import { ButtonText } from "../components/Type";
//import Icon from "react-native-vector-icons/FontAwesome";

import { Link } from '../App/routing';

const MainButtonStyle = styled.View`
  background: ${colors.primary},
  padding: 10px;
  margin: 5px;
  text-align: center;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
`;

const AltButtonStyle = styled(MainButtonStyle)`
  background: ${colors.alt};
`;

export const Button = (props) => {
  if (props.to) {
    if (Platform.OS === 'web') return (<Link to={props.to} style={{ textDecoration: 'none' }}><ButtonNative {...props} /></Link>);
    else return (<Link component={ButtonNative} {...props} />);
  }
  return (<ButtonNative {...props} />);
};

const ButtonNative = ({alt, children, onPress, title, to}) => {
  const ButtonStyle = alt ? AltButtonStyle : MainButtonStyle;
  return (
    <TouchableOpacity onPress={onPress}>
      <ButtonStyle>
        <ButtonText>{title ? title : children}</ButtonText>
      </ButtonStyle>
    </TouchableOpacity>
  );
}
