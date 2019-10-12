import React from 'react';

import {
  View,
  TouchableOpacity,
} from 'react-native';

import { Text } from 'native-base';
import { _partyNameFromKey, say, openURL } from '../common';
import Icon from 'react-native-vector-icons/FontAwesome';

export default DisplayRep = (props) => {

  const { navigate } = props.navigation;
  var { office, location, refer } = props;

  const call = async (profile) => {
    const url = 'tel:+1' + profile.phone;
    initiateLink(url);
  }

  const email = async (email) => {
    const url = 'mailto:' + email;
    initiateLink(url);
  }

  const initiateLink = async (url) => {
    let opened = await openURL(url);
    if (!opened) refer.alert(say("app_error"), say("unable_to_launch_external"));
  }

  var items = [];

  items.push(
    <View key='header' style={{margin: 5}}>
      <Text style={{marginLeft: 10, fontSize: 20}}>{office.title?office.title:office.name}</Text>
    </View>
  );

  var incumbents = office.incumbents;

  if (!incumbents) {
    incumbents = [];

    items.push(
    <View style={{margin: 5, flex: 1, flexDirection: 'row'}} key='nodata'>
      <Icon name="question-circle" size={55} color='#e3e3e3' />
      <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
        <Text style={{marginLeft: 10, fontSize: 16}}>{say("unable_determine_district")}</Text>
      </View>
    </View>
    )
  }

  for (let i = 0; i < incumbents.length; i++) {

    let incumbent = incumbents[i];

    items.push(

    <View style={{margin: 5, flex: 1, flexDirection: 'row'}} key={incumbent.name}>
      <TouchableOpacity disabled={!incumbent.phone && !incumbent.donotcall} onPress={() => call(incumbent)}>
        <Icon name="phone-square" size={55} color={(incumbent.donotcall ? '#ff0000' : (incumbent.phone ? '#5BC236' : '#e3e3e3'))} />
      </TouchableOpacity>
      <TouchableOpacity disabled={!incumbent.email} onPress={() => email(incumbent.email)}>
        <Icon style={{marginLeft: 5}} name="envelope-square" size={55} color={(incumbent.email ? '#0076ff' : '#e3e3e3')} />
      </TouchableOpacity>

      <TouchableOpacity
        style={{backgroundColor: '#ffffff', flex: 1, flexDirection: 'row', padding: 0}}
        disabled={!incumbent.name}
        onPress={() => refer.setState({polProfile: true, polProfileOffice: office, polProfileInfo: incumbent})}>
        <View style={{flex: 1}}>
          <Text style={{marginLeft: 10, fontSize: 22}}>
            {incumbent.name}
          </Text>
          <Text style={{marginLeft: 10, fontSize: 18}}>
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
