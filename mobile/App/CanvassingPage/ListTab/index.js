import React from 'react';
import { View } from 'react-native';
import { Header, Text, Button, Segment } from 'native-base';

import SegmentStreets from './SegmentStreets';
import SegmentResidence from './SegmentResidence';
import SegmentPeople from './SegmentPeople';
import SegmentHistory from './SegmentHistory';

import { say } from '../../common';

export default ListTab = props => {
  const { segmentList } = props.refer.state;

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
      <SegmentStreets refer={props.refer} />
      <SegmentResidence refer={props.refer} />
      <SegmentPeople refer={props.refer} />
      <SegmentHistory refer={props.refer} />
    </View>
  );
}
