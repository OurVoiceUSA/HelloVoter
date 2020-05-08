import React from 'react';
import { Text, View } from 'react-native';

import { Root, Content } from '../components/Layout';
import { Button } from "../components/Buttons";
import * as storage from '../lib/storage';

const MenuButton = (props) => (
  <Button to={props.to} onPress={() => props.refer.setState({menuOpen: false})} {...props} />
);

export const MainMenu = ({refer}) => {
  return (
    <Root>
      <Content>
        <MenuButton refer={refer} to="/">Dashboard</MenuButton>
        <MenuButton refer={refer} to="/canvassing">Canvassing</MenuButton>
        <MenuButton refer={refer} to="/phonebank">Phone Banking</MenuButton>
        <MenuButton refer={refer} to="/settings">Settings</MenuButton>
        <MenuButton refer={refer} to="/help">Help</MenuButton>
        <MenuButton refer={refer} to="/about">About</MenuButton>
        <MenuButton refer={refer}
          alt={true}
          onPress={() => {
            storage.del('jwt');
            refer.setState({user: null});
          }}>
          Logout
        </MenuButton>
      </Content>
    </Root>
  );
}
