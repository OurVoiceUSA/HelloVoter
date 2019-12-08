import React from 'react';
import { View } from 'react-native';
import { Header, Text, Button, Segment } from 'native-base';

import SegmentInfo from './SegmentInfo';
import SegmentTurf from './SegmentTurf';

import { say } from '../../common';

export default DispatchTab = props => {
  const { refer } = props;
  const { segmentDispatch } = refer.state;

  return (
    <View>
      <Header hasSegment style={{paddingTop: 0}}>
        <Segment>
          <Button first active={(segmentDispatch==='info')} onPress={() => refer.setState({segmentDispatch: 'info'})}><Text>Info</Text></Button>
          <Button last active={(segmentDispatch==='turf')} onPress={() => refer.setState({segmentDispatch: 'turf'})}><Text>Turf</Text></Button>
        </Segment>
      </Header>
      <SegmentInfo refer={refer} />
      <SegmentTurf refer={refer} />
    </View>
  );
}
