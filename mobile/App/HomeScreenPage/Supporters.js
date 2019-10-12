import React from 'react';

import {
  View,
} from 'react-native';

import { Text, Button, Spinner } from 'native-base';
import { say } from '../common';

export default Supporters = props => (
  <View>
    <Button block dark transparent onPress={() => props.refer.openDonate()}>
      <Text>{say("our_signature_supporters")}</Text>
    </Button>
    <Text></Text>
    <Text>{say("this_app_is_made_possible_by")}</Text>
    <Text></Text>
    <Button block onPress={() => props.refer.openDonate()}>
      <Text>{say("support_us_on_patreon")}</Text>
    </Button>
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
  </View>
)
