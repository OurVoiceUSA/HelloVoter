import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { Text } from 'native-base';

import { openDonate } from './common';

var patreonImage = require('../img/supportonpatreon.png');

export default PatreonButton = props => (
    <TouchableOpacity style={{alignItems: 'center'}} onPress={() => openDonate()}>
      {(props.text?<Text style={{margin: 10}}>{props.text}</Text>:null)}
      <Image source={patreonImage} style={{width: 250, height: 100, resizeMode: 'contain'}} />
    </TouchableOpacity>
);
