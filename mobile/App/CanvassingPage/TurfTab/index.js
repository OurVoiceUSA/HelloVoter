import React from 'react';
import { View } from 'react-native';
import { Text, Button, Segment } from 'native-base';

import SegmentList from './SegmentList';
import SegmentInfo from './SegmentInfo';

import { say } from '../../common';

export default ListTab = props => {
  const { segmentTurf } = props.refer.state;

  return (
    <View>
      <Segment>
        <Button first active={(segmentTurf==='list')} onPress={() => props.refer.setState({segmentTurf: 'list'})}><Text>List</Text></Button>
        <Button last active={(segmentTurf==='info')} onPress={() => props.refer.setState({segmentTurf: 'info'})}><Text>Info</Text></Button>
      </Segment>
      <SegmentList refer={props.refer} />
      <SegmentInfo refer={props.refer} />
    </View>
  );
}
