import React, { PureComponent } from 'react';

import {
  Dimensions,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

import { Container, Header, Content, Footer, FooterTab, Text, Button, Spinner } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';
import { _partyNameFromKey, openURL } from '../common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      office: props.navigation.state.params.office,
      profile: props.navigation.state.params.profile,
      ratings: props.navigation.state.params.profile.ratings,
      location: props.navigation.state.params.location,
    };
  }

  openFacebook = (id) => openURL('https://m.facebook.com/'+id);
  openTwitter = (id) => openURL('https://twitter.com/'+id);
  openWikipedia = (id) => openURL('https://wikipedia.org/wiki/'+id);
  openWebsite = (id) => openURL(id);
  openYoutube = (profile) => {
    if (profile.youtube_id)
      return openURL('https://youtube.com/channel/'+profile.youtube_id);
    if (profile.youtube)
      return openURL('https://youtube.com/user/'+profile.youtube);
  }

  render() {
    const { office, user, pic_url, profile } = this.state;

    var profilePic;
    var polPic;
    var polPicFallback;

    if (profile.bioguide_id) {
      polPic = {uri: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/'+profile.bioguide_id+'.jpg'};
    } else if (profile.govtrack_id) {
      polPic = {uri: 'https://www.govtrack.us/data/photos/'+profile.govtrack_id+'-200px.jpeg'};
    } else if (profile.photo_url) {
      polPic = {uri: profile.photo_url.replace('http:','https:')};
    } else {
      switch (profile.gender) {
      case 'F':
        polPic = require('../../img/nopic_female.png');
        break;
      case 'M':
        polPic = require('../../img/nopic_male.png');
        break;
      default:
        polPic = require('../../img/nopic.png');
      }
    }

    return (
    <Container>
      <Content>
        <View style={{flexDirection: 'row', alignItems: 'flex-start', margin: 10, marginBottom: 0}}>
          <View style={{height: 150, marginRight: 10}}>
            <Image resizeMode={'contain'} style={{flex: 1, width: Dimensions.get('window').width/3}} source={polPic} />
          </View>

          <View style={{flex: 1}}>
            <Text style={{fontSize: 25}} selectable={true}>
              {profile.name}
            </Text>
            <Text style={{fontSize: 18}} selectable={true}>
              {(office?office.name:'')}
            </Text>
            <Text style={{fontSize: 18}} selectable={true}>
              {_partyNameFromKey(profile.party)}
            </Text>

            <View style={{flex: 1, marginTop: 7}}>
              <View style={{flexDirection: 'row'}}>
                <View style={{marginRight: 5}}>
                        <Text style={{fontSize: 14, fontWeight: 'bold'}} selectable={true}>Phone:</Text>
                </View>
                <View>
                        <Text style={{fontSize: 14}} selectable={true}>{(profile.phone?profile.phone:"N/A")}</Text>
                </View>
              </View>
              <View style={{flexDirection: 'row'}}>
                <View style={{marginRight: 7}}>
                  <Text style={{fontSize: 14, fontWeight: 'bold'}} selectable={true}>Email:</Text>
                </View>
                <View>
                  <Text style={{fontSize: 14}} selectable={true}>{(profile.email?profile.email:"N/A")}</Text>
                </View>
              </View>
              <View style={{flexDirection: 'row'}}>
                <Text style={{fontSize: 14, fontWeight: 'bold'}} selectable={true}>Mailing Address:</Text>
              </View>
              <View style={{flexDirection: 'row'}}>
                <Text style={{fontSize: 14}} selectable={true}>{(profile.address?profile.address:"N/A")}</Text>
              </View>
            </View>

          </View>
        </View>

        <View style={{alignItems: 'center'}}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity disabled={!profile.facebook} onPress={() => {this.openFacebook(profile.facebook)}}>
              <Icon style={{margin: 10}} name="facebook" size={30} color={(profile.facebook ? '#3b5998' : '#e3e3e3')} />
            </TouchableOpacity>
            <TouchableOpacity disabled={!profile.twitter} onPress={() => {this.openTwitter(profile.twitter)}}>
              <Icon style={{margin: 10}} name="twitter" size={35} color={(profile.twitter ? '#0084b4' : '#e3e3e3')} />
            </TouchableOpacity>
            <TouchableOpacity disabled={!profile.youtube && !profile.youtube_id} onPress={() => {this.openYoutube(profile)}}>
              <Icon style={{margin: 10}} name="youtube-play" size={40} color={(profile.youtube || profile.youtube_id ? '#ff0000' : '#e3e3e3')} />
            </TouchableOpacity>
            <TouchableOpacity disabled={!profile.wikipedia_id} onPress={() => {this.openWikipedia(profile.wikipedia_id)}}>
              <Icon style={{margin: 10}} name="wikipedia-w" size={30} color={(profile.wikipedia_id ? '#000000' : '#e3e3e3')} />
            </TouchableOpacity>
            <TouchableOpacity disabled={!profile.url} onPress={() => {this.openWebsite(profile.url)}}>
              <Icon style={{margin: 10}} name="globe" size={30} color={(profile.url ? '#008080' : '#e3e3e3')} />
            </TouchableOpacity>
          </View>
        </View>

      </Content>
      <Footer>
        <FooterTab>
          <Button onPress={() => this.props.navigation.goBack()}>
            <Icon name="undo" size={25} />
            <Text>Go Back</Text>
          </Button>
        </FooterTab>
      </Footer>
    </Container>
    );
  }

}
