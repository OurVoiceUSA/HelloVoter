import React from 'react';

import { Root, Content, Space } from '../components/Layout';
import { Button } from "../components/Buttons";

import {
  IconCog, IconDash, IconDonate, IconInfo, IconMap, IconPhone,
  IconQuestion, IconRate,
} from '../lib/icons';

const MenuButton = (props) => (
  <Button to={props.to} onPress={props.refer.setMenuClose.bind(props.refer)} {...props} />
);

export const MainMenu = ({refer}) => {
  return (
    <Root>
      <Content>
        <MenuButton refer={refer} to="/"><IconDash />Dashboard</MenuButton>
        <MenuButton refer={refer} to="/canvassing"><IconMap />Canvassing</MenuButton>
        <MenuButton refer={refer} to="/phonebank"><IconPhone />Phone Banking</MenuButton>
        <MenuButton refer={refer} to="/settings"><IconCog />Settings</MenuButton>
        <Space />
        <MenuButton refer={refer} to="/help"><IconQuestion />Help</MenuButton>
        <MenuButton refer={refer} to="/about"><IconInfo />About</MenuButton>
        <MenuButton refer={refer} to="/rate"><IconRate />Give Feedback</MenuButton>
        <Space />
        <MenuButton refer={refer} to="/donate"><IconDonate />Donate</MenuButton>
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
