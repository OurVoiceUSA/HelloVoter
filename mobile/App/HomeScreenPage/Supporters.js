import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { Content, Text, Button, Spinner } from 'native-base';

import { say, openDonate } from '../common';

var patreonImage = require('../../img/supportonpatreon.png');

export default Supporters = props => (
  <Content padder>
    <Button block dark transparent onPress={() => openDonate()}>
      <Text>{say("our_signature_supporters")}</Text>
    </Button>
    <Text></Text>
    <Text>{say("this_app_is_made_possible_by")}</Text>
    <Text></Text>
    <TouchableOpacity style={{alignItems: 'center'}} onPress={() => openDonate()}>
      <Image source={patreonImage} style={{width: 250, height: 100, resizeMode: 'contain'}} />
    </TouchableOpacity>
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
)
