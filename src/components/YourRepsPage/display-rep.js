import React from 'react';
import {
  Alert,
  Linking,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';

import { _partyNameFromKey } from '../../common';
import Icon from 'react-native-vector-icons/FontAwesome';

export default DisplayRep = (props) => {

  const { navigate } = props.navigation;
  var { office, location } = props;

  // TODO: we at least know what office this is trying to be ...
  if (office.nodata)
    return (<Text style={{marginLeft: 20, fontSize: 20}}>Data Unavailable</Text>);

  var incumbents = office.incumbents;

  if (!incumbents) {
    incumbents = [];
  }

  const call = async (profile) => {
    const url = 'tel:+1' + profile.phone;

    if (profile.donotcall) {
      Alert.alert('Phone was de-listed', 'This official has requested we de-list their phone number, and did not provide an alternate one.', [{text: 'That\'s Lame'}], { cancelable: false });
    } else {
      initiateLink(url);
    }
  }

  const email = async (email) => {
    const url = 'mailto:' + email;
    initiateLink(url);
  }

  const initiateLink = async (url) => {
    return Linking.openURL(url).catch(() => {
      Alert.alert('App Error', 'Unable to launch external application.', [{text: 'OK'}], { cancelable: false })
    });
  }

  var items = [];

  items.push(
    <View key='header' style={{margin: 5}}>
      <Text style={{marginLeft: 10, fontSize: 20}}>{office.title?office.title:office.name}</Text>
    </View>
  );

  for (let i = 0; i < incumbents.length; i++) {

    let incumbent = incumbents[i];

    items.push(

    <View style={{margin: 5, flex: 1, flexDirection: 'row'}} key={incumbent.last_name+incumbent.first_name}>
      <TouchableOpacity disabled={!incumbent.phone && !incumbent.donotcall} onPress={() => call(incumbent)}>
        <Icon name="phone-square" size={55} color={(incumbent.donotcall ? '#ff0000' : (incumbent.phone ? '#5BC236' : '#e3e3e3'))} />
      </TouchableOpacity>
      <TouchableOpacity disabled={!incumbent.email} onPress={() => email(incumbent.email)}>
        <Icon style={{marginLeft: 5}} name="envelope-square" size={55} color={(incumbent.email ? '#0076ff' : '#e3e3e3')} />
      </TouchableOpacity>

      <TouchableOpacity
        style={{backgroundColor: '#ffffff', flex: 1, flexDirection: 'row', padding: 0}}
        disabled={!incumbent.last_name}
        onPress={() => {navigate('PolProfile', {location: location, office: office, profile: incumbent})}}>
        <View style={{flex: 1}}>
          <Text style={{marginLeft: 10, fontSize: 20}}>
            {incumbent.first_name + ' ' + incumbent.last_name}{"\n"}
            {(office.district?'District '+office.district+', ':'')}{_partyNameFromKey(incumbent.party)}
          </Text>
        </View>
        <View style={{justifyContent: 'center', alignItems: 'flex-end'}}>
          <Icon name="drivers-license-o" size={25} color="black"/>
        </View>
      </TouchableOpacity>
    </View>

    );
  }

  return (
<View>
      { items }
</View>
  );
}
