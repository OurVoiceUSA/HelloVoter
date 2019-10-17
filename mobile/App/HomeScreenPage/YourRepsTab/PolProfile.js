import React from 'react';

import {
  Dimensions,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

import { Text, Button } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';
import { _partyNameFromKey, openURL } from '../../common';

function openYoutube(profile) {
  if (profile.youtube_id)
    return openURL('https://youtube.com/channel/'+profile.youtube_id);
  if (profile.youtube)
    return openURL('https://youtube.com/user/'+profile.youtube);
}

export default PolProfile = props => {

  let office = props.office;
  let profile = props.profile;

  var profilePic;
  var polPic;
  var polPicFallback;

  if (profile.bioguide_id) {
    polPic = {uri: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/'+profile.bioguide_id+'.jpg'};
  } else if (profile.govtrack_id) {
    polPic = {uri: 'https://www.govtrack.us/data/photos/'+profile.govtrack_id+'-200px.jpeg'};
  } else if (profile.photo_url) {
    polPic = {uri: profile.photo_url};
  }

  return (
    <View>
      <Image resizeMode={'contain'} source={polPic} />

      <Text style={{fontSize: 25}} selectable={true}>
        {profile.name}
      </Text>
      <Text style={{fontSize: 18}} selectable={true}>
        {(office?office.name:'')}
      </Text>
      <Text style={{fontSize: 18}} selectable={true}>
        {_partyNameFromKey(profile.party)}
      </Text>

      <Text style={{fontSize: 14, fontWeight: 'bold'}} selectable={true}>Phone:</Text>
      <Text style={{fontSize: 14}} selectable={true}>{(profile.phone?profile.phone:"N/A")}</Text>
      <Text style={{fontSize: 14, fontWeight: 'bold'}} selectable={true}>Email:</Text>
      <Text style={{fontSize: 14}} selectable={true}>{(profile.email?profile.email:"N/A")}</Text>
      <Text style={{fontSize: 14, fontWeight: 'bold'}} selectable={true}>Mailing Address:</Text>
      <Text style={{fontSize: 14}} selectable={true}>{(profile.address?profile.address:"N/A")}</Text>

      <View style={{alignItems: 'center'}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity disabled={!profile.facebook} onPress={() => openURL('https://m.facebook.com/'+profile.facebook)}>
            <Icon style={{margin: 10}} name="facebook" size={30} color={(profile.facebook ? '#3b5998' : '#aaa')} />
          </TouchableOpacity>
          <TouchableOpacity disabled={!profile.twitter} onPress={() => openURL('https://twitter.com/'+profile.twitter)}>
            <Icon style={{margin: 10}} name="twitter" size={35} color={(profile.twitter ? '#0084b4' : '#aaa')} />
          </TouchableOpacity>
          <TouchableOpacity disabled={!profile.youtube && !profile.youtube_id} onPress={() => openYoutube(profile)}>
            <Icon style={{margin: 10}} name="youtube-play" size={40} color={(profile.youtube || profile.youtube_id ? '#ff0000' : '#aaa')} />
          </TouchableOpacity>
          <TouchableOpacity disabled={!profile.wikipedia_id} onPress={() => openURL('https://wikipedia.org/wiki/'+profile.wikipedia_id)}>
            <Icon style={{margin: 10}} name="wikipedia-w" size={30} color={(profile.wikipedia_id ? '#000000' : '#aaa')} />
          </TouchableOpacity>
          <TouchableOpacity disabled={!profile.url} onPress={() => openURL(profile.url)}>
            <Icon style={{margin: 10}} name="globe" size={30} color={(profile.url ? '#008080' : '#aaa')} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
