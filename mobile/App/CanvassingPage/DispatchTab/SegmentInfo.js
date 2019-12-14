import React from 'react';
import { View } from 'react-native';
import { Body, Right, Text, List, ListItem } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';

import { say } from '../../common';

var reA = /[^a-zA-Z]/g;
var reN = /[^0-9]/g;

function sortAlphaNum(ao, bo) {
  let a = ao.name;
  let b = bo.name;

  let aA = a.replace(reA, "");
  let bA = b.replace(reA, "");
  if (aA === bA) {
    let aN = parseInt(a.replace(reN, ""), 10);
    let bN = parseInt(b.replace(reN, ""), 10);
    return aN === bN ? 0 : aN > bN ? 1 : -1;
  } else {
    return aA > bA ? 1 : -1;
  }
}

export default SegmentInfo = props => {
  const { refer } = props;
  const { admin, segmentDispatch, turfs, forms, orgId, server  } = refer.state;
  if (segmentDispatch!=='info') return null;
  return (
    <List>
      <ListItem>
        <Body>
          <Text>{(orgId?"Organization ID:":"Server:")}</Text>
        </Body>
        <Right>
          <Text>{(orgId?orgId:server)}</Text>
        </Right>
      </ListItem>
      <ListItem onPress={() => {
        if (forms.length > 1) refer.setState({selectFormDialog: true});
      }}>
        <Body>
          <Text>{(admin?"Number of":"Associated")} Forms:</Text>
        </Body>
        <Right>
          <Text>{forms.length}</Text>
        </Right>
      </ListItem>
      <ListItem>
        <Body>
          <Text>{(admin?"Number of":"Associated")} Volunteers:</Text>
        </Body>
        <Right>
          <Text>{(admin?"N/A":"1")}</Text>
        </Right>
      </ListItem>
      <ListItem itemDivider>
        <Body>
          <Text>Turf List</Text>
        </Body>
      </ListItem>
      {turfs.sort(sortAlphaNum).map(t => (
        <ListItem key={t.id} onPress={() => refer.setState({selectedTurf: t}, () => refer._loadturfInfo())}>
          <Body><Text>{t.name}</Text></Body>
          <Right>
            <Icon name="angle-double-right" size={25} />
          </Right>
        </ListItem>
      ))}
      {(admin)&&
      <View>
        <ListItem itemDivider>
          <Body>
            <Text>Dispatch Admin</Text>
          </Body>
        </ListItem>
        <ListItem>
          <Body>
            <Text>Form, Turf, and Volunteer administration functions are currently only available in our web application, which is designed for use on large screen only. From a computer or tablet, open a web browser and navigate to this URL:</Text>
            <Text></Text>
            <Text>https://apps.ourvoiceusa.org/HelloVoterHQ/</Text>
          </Body>
        </ListItem>
      </View>
      }
    </List>
  );
};
