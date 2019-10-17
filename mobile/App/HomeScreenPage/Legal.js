import React from 'react';
import {
  View,
  Platform,
} from 'react-native';
import { Text, Button, Spinner } from 'native-base';
import { say, openGitHub } from '../common';

export default Legal = props => (
  <View>
    <Text>
      HelloVoter Version {props.version}
    </Text>
    <Text></Text>
    <Text>
      Copyright (c) 2018, Our Voice USA. {say("all_rights_reserved")}
    </Text>
    <Text></Text>
    <Text>{say("this_program_is_free_software")}</Text>
    <Text></Text>
    {Platform.OS === 'ios'&&
      <Text>{say("note_about_apple_eula")}</Text>
    }
    <Text></Text>
    <Button block primary onPress={() => openGitHub('HelloVoter')}>
      <Text>{say("tap_here_for_source_code")}</Text>
    </Button>
  </View>
);
