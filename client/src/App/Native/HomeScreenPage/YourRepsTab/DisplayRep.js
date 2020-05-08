import React from 'react';

import {
  View,
  TouchableOpacity,
} from 'react-native';

import { Text } from 'native-base';
import { say, openURL } from '../../common';
import Icon from 'react-native-vector-icons/FontAwesome';

export default DisplayRep = ({refer, office, info}) => {
  const { name, address, party, phones, emails} = info;

  const call = async (arr) => {
    const url = 'tel:+1' + arr[0];
    initiateLink(url);
  }

  const email = async (arr) => {
    const url = 'mailto:' + arr[0];
    initiateLink(url);
  }

  const initiateLink = async (url) => {
    let opened = await openURL(url);
    if (!opened) refer.alert(say("app_error"), say("unable_to_launch_external"));
  }

  return (
    <View style={{margin: 5, flex: 1, flexDirection: 'row'}}>
      <TouchableOpacity disabled={!phones} onPress={() => call(phones)}>
        <Icon name="phone-square" size={55} color={(phones ? '#5BC236' : '#e3e3e3')} />
      </TouchableOpacity>
      <TouchableOpacity disabled={!emails} onPress={() => email(emails)}>
        <Icon style={{marginLeft: 5}} name="envelope-square" size={55} color={(emails ? '#0076ff' : '#e3e3e3')} />
      </TouchableOpacity>

      <TouchableOpacity
        style={{backgroundColor: '#ffffff', flex: 1, flexDirection: 'row', padding: 0}}
        disabled={!name}
        onPress={() => refer.setState({polProfile: true, office, polProfileInfo: info})}>
        <View style={{flex: 1}}>
          <Text style={{marginLeft: 10, fontSize: 22}}>
            {name}
          </Text>
          <Text style={{marginLeft: 10, fontSize: 18}}>
            {party}
          </Text>
        </View>
        <View style={{justifyContent: 'center', alignItems: 'flex-end'}}>
          <Icon name="drivers-license-o" size={25} color="black"/>
        </View>
      </TouchableOpacity>
    </View>
  );
}
