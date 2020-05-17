import React from 'react';

import { Root, Content, Space } from '../components/Layout';
import { Button } from "../components/Buttons";

const MenuButton = (props) => (
  <Button to={props.to} onPress={props.refer.setMenuClose.bind(props.refer)} {...props} />
);

export const MainMenu = ({refer}) => {
  return (
    <Root>
      <Content>
        <MenuButton refer={refer} to="/">Dashboard</MenuButton>
        <MenuButton refer={refer} to="/canvassing">Canvassing</MenuButton>
        <MenuButton refer={refer} to="/phonebank">Phone Banking</MenuButton>
        <MenuButton refer={refer} to="/settings">Settings</MenuButton>
        <Space />
        <MenuButton refer={refer} to="/help">Help</MenuButton>
        <MenuButton refer={refer} to="/about">About</MenuButton>
        <MenuButton refer={refer} to="/rate">Give Feedback</MenuButton>
        <Space />
        <MenuButton refer={refer} to="/donate">Donate</MenuButton>
        <Space />
        <MenuButton refer={refer}
          alt={true}
          onPress={refer.logout.bind(refer)}>
          Logout
        </MenuButton>
      </Content>
    </Root>
  );
}
