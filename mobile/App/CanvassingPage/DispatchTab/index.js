import React from 'react';
import { View } from 'react-native';
import { Header, Text, Button, Segment } from 'native-base';

import SegmentInfo from './SegmentInfo';
import SegmentTurf from './SegmentTurf';

import { WalkthroughElement } from 'react-native-walkthrough';

import { say, makeTooltipContent } from '../../common';

export const walkthroughDispatch = [
  {
    id: 'start-list-walkthrough',
    content: makeTooltipContent("This is Dispatch. Tap the screen to move onto the next tooltip of this brief walkthrough."),
    tooltipProps: {allowChildInteraction: false},
  },
  {
    id: 'dispatch-header',
    content: makeTooltipContent("You can navigate within Dispatch by tapping a segment here."),
    tooltipProps: {allowChildInteraction: false, placement: 'bottom'},
  },
  {
    id: 'turf-list',
    content: makeTooltipContent("The turf you have access to is listed here. Tap them to view info and see its QR Code."),
  },
];

export default DispatchTab = props => {
  const { refer } = props;
  const { segmentDispatch } = refer.state;

  return (
    <View>
      <WalkthroughElement id="dispatch-header">
        <Header hasSegment style={{paddingTop: 0}}>
          <Segment>
            <Button first active={(segmentDispatch==='info')} onPress={() => refer.setState({segmentDispatch: 'info'})}><Text>Info</Text></Button>
            <Button last active={(segmentDispatch==='turf')} onPress={() => refer.setState({segmentDispatch: 'turf'})}><Text>Turf</Text></Button>
          </Segment>
        </Header>
      </WalkthroughElement>
      <SegmentInfo refer={refer} />
      <SegmentTurf refer={refer} />
    </View>
  );
}
