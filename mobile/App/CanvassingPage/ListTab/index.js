import React from 'react';
import { View } from 'react-native';
import { Header, Body, Text, Button, Segment, CheckBox, Item, Input, ListItem } from 'native-base';

import SegmentStreets from './SegmentStreets';
import SegmentResidence from './SegmentResidence';
import SegmentPeople from './SegmentPeople';
import SegmentHistory from './SegmentHistory';

import Icon from 'react-native-vector-icons/FontAwesome';

import { say } from '../../common';

export default ListTab = props => {
  const { onlyPhonePeople, segmentList } = props.refer.state;

  return (
    <View>
      <Header hasSegment style={{paddingTop: 0}}>
        <Segment>
          <Button first active={(segmentList==='streets')} onPress={() => props.refer.setState({segmentList: 'streets'})}><Text>Streets</Text></Button>
          <Button active={(segmentList==='residence')} onPress={() => props.refer.setState({segmentList: 'residence'})}><Text>Residence</Text></Button>
          <Button active={(segmentList==='people')} onPress={() => props.refer.setState({segmentList: 'people'})}><Text>People</Text></Button>
          <Button last active={(segmentList==='history')} onPress={() => props.refer.setState({segmentList: 'history'})}><Text>History</Text></Button>
        </Segment>
      </Header>
      {segmentList==='people'&&
      <View>
        <Header searchBar rounded>
          <Item>
            <Icon name="search" />
            <Input placeholder="Search" onChangeText={text => props.refer.peopleSearchDebounce(text)} />
            <Icon name="group" />
          </Item>
        </Header>
        <ListItem onPress={() => props.refer.setState({onlyPhonePeople: !onlyPhonePeople})}>
          <CheckBox checked={onlyPhonePeople} onPress={() => props.refer.setState({onlyPhonePeople: !onlyPhonePeople})} />
          <Body>
            <Text>{say("Only show those with a Phone Number")}</Text>
          </Body>
        </ListItem>
      </View>
      }
      <SegmentStreets refer={props.refer} />
      <SegmentResidence refer={props.refer} />
      <SegmentPeople refer={props.refer} />
      <SegmentHistory refer={props.refer} />
    </View>
  );
}
