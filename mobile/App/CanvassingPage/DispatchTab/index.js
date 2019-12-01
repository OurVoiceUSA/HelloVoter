import React from 'react';
import { View } from 'react-native';
import { Header, Text, Button, Segment } from 'native-base';

import SegmentList from './SegmentList';
import SegmentTurf from './SegmentTurf';

import { say } from '../../common';

export default DispatchTab = props => {
  const { refer } = props;
  const { segmentTurf } = refer.state;

  return (
    <View>
      <Header hasSegment style={{paddingTop: 0}}>
        <Segment>
          <Button first active={(segmentTurf==='list')} onPress={() => refer.setState({segmentTurf: 'list'})}><Text>List</Text></Button>
          <Button last active={(segmentTurf==='turf')} onPress={() => refer.setState({segmentTurf: 'turf'})}><Text>Turf</Text></Button>
        </Segment>
      </Header>
      <SegmentList refer={refer} />
      <SegmentTurf refer={refer} />
    </View>
  );
}
