import React from 'react';
import { View } from 'react-native';
import { Header, Text, Button, Segment } from 'native-base';

import SegmentStreets from './SegmentStreets';
import SegmentResidence from './SegmentResidence';
import SegmentPeople from './SegmentPeople';
import SegmentHistory from './SegmentHistory';

import { say } from '../../common';

export default ListTab = props => {
  const { refer } = props;
  const { segmentList } = refer.state;

  return (
    <View>
      <Header hasSegment style={{paddingTop: 0}}>
        <Segment>
          <Button first active={(segmentList==='streets')} onPress={() => refer.setState({segmentList: 'streets'})}><Text>Streets</Text></Button>
          <Button active={(segmentList==='residence')} onPress={() => refer.setState({segmentList: 'residence'})}><Text>Residence</Text></Button>
          <Button active={(segmentList==='people')} onPress={() => refer.setState({segmentList: 'people'})}><Text>People</Text></Button>
          <Button last active={(segmentList==='history')} onPress={() => refer.setState({segmentList: 'history'})}><Text>History</Text></Button>
        </Segment>
      </Header>
      <SegmentStreets refer={refer} />
      <SegmentResidence refer={refer} />
      <SegmentPeople refer={refer} />
      <SegmentHistory refer={refer} />
    </View>
  );
}
