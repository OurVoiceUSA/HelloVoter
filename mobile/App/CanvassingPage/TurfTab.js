import React from 'react';

import { View } from 'react-native';

import { Content, Text, Button, List, ListItem, Spinner, Segment } from 'native-base';
import Icon from 'react-native-vector-icons/FontAwesome';

import { say } from '../common';

export default ListTab = props => {
  const { segmentTurf } = props.refer.state;

  return (
    <View>
      <Segment>
        <Button first active={(segmentTurf==='list')} onPress={() => props.refer.setState({segmentTurf: 'list'})}><Text>List</Text></Button>
        <Button last active={(segmentTurf==='stats')} onPress={() => props.refer.setState({segmentTurf: 'stats'})}><Text>Stats</Text></Button>
      </Segment>
      <SegmentList refer={props.refer} />
      <SegmentStats refer={props.refer} />
    </View>
  );
}

function byname(a,b) {
  let na = a.name;
  let nb = b.name;

  if ( na < nb ) return -1;
  if ( na > nb ) return 1;
  return 0;
}

const SegmentList = props => {
  let rstate = props.refer.state;
  if (rstate.segmentTurf!=='list') return null;

  return (
    <List>
    {rstate.turfs.sort(byname).map(t => (
      <ListItem onPress={() => props.refer.setState({selectedTurf: t}, () => props.refer._loadTurfStats())}>
        <Text>{t.name}</Text>
      </ListItem>
    ))}
    </List>
  );
};

const SegmentStats = props => {
  let rstate = props.refer.state;
  if (rstate.segmentTurf!=='stats') return null;

  if (!rstate.fetchingTurfStats && Object.keys(rstate.turfStats).length === 0)
    return (<Text>No turf selected.</Text>);

  return (
    <View>
      {rstate.fetchingTurfStats&&
      <Spinner />
      ||
      <List>
        {Object.keys(rstate.turfStats.stats).map((s) => (
          <Text>{s}: {JSON.stringify(rstate.turfStats.stats[s])}</Text>
        ))}
      </List>
      }
    </View>
  );
};
