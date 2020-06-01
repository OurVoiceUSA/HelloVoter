/* eslint-disable no-mixed-operators */
import React from 'react';
import { Rate, AndroidMarket } from '../lib/react-native';

import { Root, Content, Space } from '../components/Layout';
import { isOnlyWeb, isOnlyNative } from '../lib/common';
import { Button } from '../components/Buttons';
import { Icon } from '.';

const MenuButton = (props) => {
  //if (props.to && props.to.match(/^\/admin/) && !props.refer.state.user.admin) return null;
  return (
    <Button to={props.to} onPress={props.refer.setMenuClose.bind(props.refer)} {...props} />
  )
};

export default ({ refer }) => {
  return (
    <Root>
      <Content>
        <MenuButton refer={refer} to="/"><Icon.Dash />Dashboard</MenuButton>
        <MenuButton refer={refer} to="/canvassing"><Icon.Map />Canvassing</MenuButton>
        <MenuButton refer={refer} to="/phonebank"><Icon.Phone />Phone Banking</MenuButton>
        <MenuButton refer={refer} to="/settings"><Icon.Cog />Settings</MenuButton>
        <MenuButton refer={refer} to="/admin/volunteers"><Icon.Person />Volunteers</MenuButton>
        <MenuButton refer={refer} to="/admin/turfs"><Icon.Map />Turf</MenuButton>
        <MenuButton refer={refer} to="/admin/forms"><Icon.Clipboard />Forms</MenuButton>
        <MenuButton refer={refer} to="/admin/qrcodes"><Icon.QRCode />QRCodes</MenuButton>
        <MenuButton refer={refer} to="/admin/attributes"><Icon.Paperclip />Attributes</MenuButton>
        <MenuButton refer={refer} to="/admin/queue"><Icon.Queue />Queue</MenuButton>
        {isOnlyWeb()&&
          <MenuButton refer={refer} to="/admin/import" admin={true}><Icon.Upload />Import Data</MenuButton>
        }
        <Space />
        <MenuButton refer={refer} to="/help"><Icon.Question />Help</MenuButton>
        <MenuButton refer={refer} to="/about"><Icon.Info />About</MenuButton>
        {isOnlyNative()&&
          <Button onPress={() => {
            Rate.rate({
              AppleAppID: "1275301651",
              GooglePackageName: "org.ourvoiceinitiative.ourvoice",
              preferredAndroidMarket: AndroidMarket.Google,
              preferInApp: false,
              openAppStoreIfInAppFails: true,
            }, (success) => {});
          }}><Icon.Rate />Give Feedback</Button>
        ||
          <MenuButton refer={refer} to="/feedback"><Icon.Rate />Give Feedback</MenuButton>
        }
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
