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

export default SegmentList = props => {
  const { refer } = props;
  const { segmentTurf, turfs } = refer.state;
  if (segmentTurf!=='list') return null;

  return (
    <List>
    {turfs.sort(sortAlphaNum).map(t => (
      <ListItem icon key={t.id} onPress={() => refer.setState({selectedTurf: t}, () => refer._loadturfInfo())}>
        <Body><Text>{t.name}</Text></Body>
        <Right>
          <Icon name="angle-double-right" size={25} />
        </Right>
      </ListItem>
    ))}
    </List>
  );
};
