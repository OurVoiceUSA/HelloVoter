import React from 'react';
import {
  View,
  Platform,
} from 'react-native';
import { Text, Button, Spinner } from 'native-base';
import { URL_TERMS_OF_SERVICE, URL_PRIVACY_POLICY, say, openGitHub, openURL } from '../common';

export default Legal = props => (
  <View>
    <Text>
      HelloVoter Version {props.version}
    </Text>
    <Text></Text>
    <Text>
      Copyright (c) 2019, Our Voice USA. {say("all_rights_reserved")}
    </Text>
    <Text></Text>
    <Text>{say("this_program_is_free_software")}</Text>
    <Text></Text>
    <View style={{flex: 1, width: 300, alignSelf: 'center', alignItems: 'center'}}>
      <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
        <Button primary onPress={() => openURL(URL_TERMS_OF_SERVICE)}><Text>{say("termsofservice")}</Text></Button>
        <Text>{'  '}</Text>
        <Button primary onPress={() => openURL(URL_PRIVACY_POLICY)}><Text>{say("privacypolicy")}</Text></Button>
      </View>
      <Button block danger onPress={() => openGitHub('HelloVoter')}>
      <Text>{say("app_source_code")}</Text>
      </Button>
    </View>
    <Text></Text>
    {Platform.OS === 'ios'&&
    <Text>{say("note_about_apple_eula")}</Text>
    }
  </View>
);
