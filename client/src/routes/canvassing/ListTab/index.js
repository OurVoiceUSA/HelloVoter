import React from 'react';
import { View } from 'react-native';
import { Header, Text, Button, Segment } from 'native-base';
import { WalkthroughElement } from 'react-native-walkthrough';

import { makeTooltipContent } from '../../../lib/common';
import SegmentResidence from './SegmentResidence';
import SegmentStreets from './SegmentStreets';
import SegmentHistory from './SegmentHistory';
import SegmentPeople from './SegmentPeople';

export const walkthroughListView = [
  {
    id: 'start-list-walkthrough',
    content: makeTooltipContent("This is the List View. Tap the screen to move onto the next tooltip of this brief walkthrough."),
    tooltipProps: {allowChildInteraction: false},
  },
  {
    id: 'listview-header',
    content: makeTooltipContent("You can navigate within the List View by tapping a segment here."),
    tooltipProps: {allowChildInteraction: false, placement: 'bottom'},
  },
  {
    id: 'segment-streets',
    content: makeTooltipContent("This lists nearby streets. Tap the street name to expand it and list the addresses on that street."),
    tooltipProps: {allowChildInteraction: false, placement: 'bottom'},
  },
  {
    id: 'segment-residence',
    content: makeTooltipContent("This shows the residence that was last selected, either from the map view or the street view. It's here you view people who live at an address and can make changes to their records."),
    tooltipProps: {allowChildInteraction: false, placement: 'bottom'},
  },
  {
    id: 'segment-people',
    content: makeTooltipContent("This lists the people who live at the nearby addresses on record."),
    tooltipProps: {allowChildInteraction: false, placement: 'bottom'},
  },
  {
    id: 'segment-history',
    content: makeTooltipContent("This lists canvassing history of the area you're viewing."),
    tooltipProps: {allowChildInteraction: false, placement: 'bottom'},
  },
];

export default ListTab = props => {
  const { refer } = props;
  const { segmentList } = refer.state;

  return (
    <View>
      <WalkthroughElement id="listview-header">
        <Header hasSegment style={{paddingTop: 0}}>
          <Segment>
            <WalkthroughElement id="segment-streets">
              <Button first active={(segmentList==='streets')} onPress={() => refer.setState({segmentList: 'streets'})}><Text>Streets</Text></Button>
            </WalkthroughElement>
            <WalkthroughElement id="segment-residence">
              <Button active={(segmentList==='residence')} onPress={() => refer.setState({segmentList: 'residence'})}><Text>Residence</Text></Button>
            </WalkthroughElement>
            <WalkthroughElement id="segment-people">
              <Button active={(segmentList==='people')} onPress={() => refer.setState({segmentList: 'people'})}><Text>People</Text></Button>
            </WalkthroughElement>
            <WalkthroughElement id="segment-history">
              <Button last active={(segmentList==='history')} onPress={() => refer.setState({segmentList: 'history'})}><Text>History</Text></Button>
            </WalkthroughElement>
          </Segment>
        </Header>
      </WalkthroughElement>
      <SegmentStreets refer={refer} />
      <SegmentResidence refer={refer} />
      <SegmentPeople refer={refer} />
      <SegmentHistory refer={refer} />
    </View>
  );
}
