import React from 'react';

import { Root, Content, Space } from '../components/Layout';
import { Button } from "../components/Buttons";

import * as Icon from '../components/icons';
import { isOnlyWeb } from '../lib/common';

const MenuButton = (props) => (
  <Button to={props.to} onPress={props.refer.setMenuClose.bind(props.refer)} {...props} />
);

export const MainMenu = ({refer}) => {
  return (
    <Root>
      <Content>
        <MenuButton refer={refer} to="/"><Icon.Dash />Dashboard</MenuButton>
        <MenuButton refer={refer} to="/canvassing"><Icon.Map />Canvassing</MenuButton>
        <MenuButton refer={refer} to="/phonebank"><Icon.Phone />Phone Banking</MenuButton>
        <MenuButton refer={refer} to="/settings"><Icon.Cog />Settings</MenuButton>
        {isOnlyWeb()&&
          <MenuButton refer={refer} to="/admin"><Icon.Cog />Admin</MenuButton>
        }
        <Space />
        <MenuButton refer={refer} to="/help"><Icon.Question />Help</MenuButton>
        <MenuButton refer={refer} to="/about"><Icon.Info />About</MenuButton>
        <MenuButton refer={refer} to="/rate"><Icon.Rate />Give Feedback</MenuButton>
        <Space />
        <MenuButton refer={refer} to="/donate"><Icon.Donate />Donate</MenuButton>
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
