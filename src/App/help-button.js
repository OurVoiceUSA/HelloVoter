import React from 'react';
import {
  TouchableOpacity,
  View,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';

export default HelpButton = (props) => {
  return (
    <TouchableOpacity {...props} style={{marginRight: 10}}>
      <Icon name='question-circle' size={25} color='black' />
    </TouchableOpacity>
  );
}
