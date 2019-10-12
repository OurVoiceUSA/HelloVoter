import React from 'react';

import { View } from 'react-native';

import { Content, Text, Button, Spinner, Segment } from 'native-base';
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
      <Content>
        <Text>{JSON.stringify(props.refer.state.turfs.map(t => t.name))}</Text>
        <TurfStats refer={this} loading={props.refer.state.fetchingTurfStats} data={props.refer.state.turfStats} />
      </Content>
    </View>
  );
}

const TurfStats = props => (
  <View>
    {props.loading&&
    <Spinner />
    }
    {!props.loading&&
    <View style={{padding: 10}}>
      <Text>{JSON.stringify(props.data.stats)}</Text>
    </View>
    }
  </View>
);
