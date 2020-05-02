import * as React from "react";
import { colors } from "../colors";
import { TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { ButtonText } from "../components/Type";
import Icon from "react-native-vector-icons/FontAwesome";

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
  const ButtonStyle = props.alt ? AltButtonStyle : MainButtonStyle;
  return (
    <TouchableOpacity onPress={props.onPress}>
      <ButtonStyle>
        {props.icon && <Icon name={props.icon} size={24} color="#fff" />}
        <ButtonText>{props.title ? props.title : props.children}</ButtonText>
      </ButtonStyle>
    </TouchableOpacity>
  );
};
