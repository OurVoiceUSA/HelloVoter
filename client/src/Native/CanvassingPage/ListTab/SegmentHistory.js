import React from 'react';
import { View } from 'react-native';
import { Body, Content, Text, Spinner, Left, Right, List, ListItem, Thumbnail } from 'native-base';

import { say } from '../../common';

function statusToText(code) {
  switch (code) {
    case 0: return 'Not Home';
    case 1: return 'Home';
    case 2: return 'Not Interested';
    case 3: return 'Moved';
    default: return 'unknown';
  }
}

function dateFormat(epoch) {
  return new Date(epoch).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
}

function timeFormat(epoch) {
  return new Date(epoch).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

export default SegmentHistory = props => {
  const { refer } = props;
  const { segmentList, fetchingHistory, history } = refer.state;
  if (segmentList!=='history') return null;
  let lastday;

  return (
    <Content>
      {fetchingHistory&&
      <Spinner />
      }
      {!fetchingHistory&&
      <View style={{padding: 10}}>
        <Text>{(history.length?'Loaded '+history.length+' historical actions:':'No history to view')}</Text>
      </View>
      }
      <List>
        {history.map((item, idx) => {
          let showtoday = false;
          let today = dateFormat(item.datetime);
          if (lastday !== today) {
            lastday = today;
            showtoday = true;
          }
          return (
            <View key={idx}>
              {showtoday &&
              <ListItem itemDivider>
                <Text>{today}</Text>
              </ListItem>
              }
              <ListItem avatar onPress={() => refer.animateToCoordinate({longitude: item.address.position.x, latitude: item.address.position.y}, 1000)}>
                <Left>
                  <Thumbnail source={{ uri: item.volunteer.avatar }} />
                </Left>
                <Body>
                  <Text>{item.address.street}</Text>
                  <Text>{statusToText(item.status)}</Text>
                  <Text>{(item.person?item.person.name:'')}</Text>
                </Body>
                <Right>
                  <Text note>{timeFormat(item.datetime)}</Text>
                </Right>
              </ListItem>
            </View>
          );
        })}
      </List>
    </Content>
  );
};
