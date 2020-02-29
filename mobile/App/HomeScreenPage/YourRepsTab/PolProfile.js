import React from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import { Text, Button } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';
import { _partyNameFromKey, openURL } from '../../common';

function openYoutube(val) {
  if (val.match(/^UC/))
    return openURL('https://youtube.com/channel/'+val);
  else
    return openURL('https://youtube.com/user/'+val);
}

function _displayAddress(addr) {
  return (addr.line1?addr.line1:"")+
    " "+(addr.line2?addr.line2:"")+
    " "+(addr.city?addr.city:"")+
    " "+(addr.state?addr.state:"")+
    " "+(addr.zip?addr.zip:"");
}

export default PolProfile = ({office, profile}) => {

  var polPic;
  var polPicFallback;

  if (profile.photoUrl) {
    polPic = {uri: profile.photoUrl};
  }

  // convert "channel" types to static vars
  let facebook;
  let twitter;
  let youtube;

  if (profile.channels) {
    for (let ch in profile.channels) {
      switch (profile.channels[ch].type) {
        case 'Facebook': facebook = profile.channels[ch].id; break;
        case 'Twitter': twitter = profile.channels[ch].id; break;
        case 'YouTube': youtube = profile.channels[ch].id;
      }
    }
  }

  return (
    <View>
      <Image resizeMode={'contain'} source={polPic} />

      <Text style={{fontSize: 25}} selectable={true}>
        {profile.name}
      </Text>
      <Text style={{fontSize: 18}} selectable={true}>
        {office}
      </Text>
      <Text style={{fontSize: 18}} selectable={true}>
        {_partyNameFromKey(profile.party)}
      </Text>

      <Text style={{fontSize: 14, fontWeight: 'bold'}} selectable={true}>Phone:</Text>
      <Text style={{fontSize: 14}} selectable={true}>{(profile.phones?profile.phones[0]:"N/A")}</Text>
      <Text style={{fontSize: 14, fontWeight: 'bold'}} selectable={true}>Email:</Text>
      <Text style={{fontSize: 14}} selectable={true}>{(profile.emails?profile.emails[0]:"N/A")}</Text>
      <Text style={{fontSize: 14, fontWeight: 'bold'}} selectable={true}>Mailing Address:</Text>
      <Text style={{fontSize: 14}} selectable={true}>{(profile.address?_displayAddress(profile.address[0]):"N/A")}</Text>

      <View style={{alignItems: 'center'}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity disabled={!facebook} onPress={() => openURL('https://m.facebook.com/'+facebook)}>
            <Icon style={{margin: 10}} name="facebook" size={30} color={(facebook ? '#3b5998' : '#aaa')} />
          </TouchableOpacity>
          <TouchableOpacity disabled={!twitter} onPress={() => openURL('https://twitter.com/'+twitter)}>
            <Icon style={{margin: 10}} name="twitter" size={35} color={(twitter ? '#0084b4' : '#aaa')} />
          </TouchableOpacity>
          <TouchableOpacity disabled={!youtube} onPress={() => openYoutube(youtube)}>
            <Icon style={{margin: 10}} name="youtube-play" size={40} color={(youtube ? '#ff0000' : '#aaa')} />
          </TouchableOpacity>
          <TouchableOpacity disabled={!profile.urls} onPress={() => openURL(profile.urls[0])}>
            <Icon style={{margin: 10}} name="globe" size={30} color={(profile.urls ? '#008080' : '#aaa')} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
