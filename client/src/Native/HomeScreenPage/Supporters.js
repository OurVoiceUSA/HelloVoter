import React from 'react';
import { View } from 'react-native';
import { Content, Text, Button, Spinner } from 'native-base';
import PatreonButton from '../PatreonButton';

import { say, openDonate } from '../common';

export default Supporters = props => (
  <Content padder>
    <Button block dark transparent onPress={() => openDonate()}>
      <Text>{say("our_signature_supporters")}</Text>
    </Button>
    <PatreonButton text={say("this_app_is_made_possible_by")} />
    <Text></Text>
    {(!props.names || props.names.length === 0)&&
      <View>
        <Spinner />
        <Text>{say("loading_data")}...</Text>
      </View>
    ||
      <View>
        {props.names.map((name, idx) => (<Text key={idx}>{name}</Text>))}
      </View>
    }
  </Content>
);
