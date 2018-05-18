import React from 'react';
import {
  TouchableOpacity,
  View,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';

export default SettingsButton = (props) => {
  const { navigate } = props.nav;
  return (
    <TouchableOpacity
      onPress={() => navigate("Settings")}
      {...props} style={{marginRight: 10}}>
      <Icon name='bars' size={25} color='grey' />
    </TouchableOpacity>
  );
}
