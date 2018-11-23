import React, { PureComponent } from 'react';
import {
  Text,
  View,
  Linking,
  TouchableOpacity,
  Share,
  ScrollView
} from 'react-native';

import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/FontAwesome';

export default class App extends PureComponent {

  openFacebook = () => this.openURL('https://m.facebook.com/OurVoiceUsa');
  openTwitter = () => this.openURL('https://twitter.com/OurVoiceUsa');
  openYouTube = () => this.openURL('https://www.youtube.com/channel/UCw5fpnK-IZVQ4IkYuapIbiw');
  openWebsite = () => this.openURL('https://ourvoiceusa.org/');
  openGitHub = (repo) => this.openURL('https://github.com/OurVoiceUSA/'+(repo?repo:''));
  openDonate = () => this.openURL('https://ourvoiceusa.org/donate-today-saves-tomorrow/');

  openURL = (url) => {
    return Linking.openURL(url).catch(() => null);
  }

  render() {
    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}} testID="scrollView">

        <Text style={{margin: 5, fontSize: 18, color: 'black', fontWeight: 'bold'}}>
          Who We Are
        </Text>

        <Text style={{margin: 15, fontSize: 18, color: 'dimgray'}}>
          Our Voice USA is a non-partisan organization registered as a 501(c)(3)
          non-profit charity. We provide access to tools, resources, and collaboration that
          enables every day people to be politically engaged. Check us out on social media!
        </Text>

        <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
          <Icon name="facebook-official" size={40} color="#3b5998" style={{marginRight: 25}} onPress={this.openFacebook} />
          <Icon name="twitter" size={40} color="#0084b4" style={{marginRight: 25}} onPress={this.openTwitter} />
          <Icon name="youtube-play" size={40} color="#ff0000" style={{marginRight: 25}} onPress={this.openYouTube} />
          <Icon name="github" size={40} style={{marginRight: 25}} onPress={() => {this.openGitHub(null)}} />
          <Icon name="globe" size={40} color="#008080" onPress={this.openWebsite} />
        </View>

        <View style={{marginLeft: 50, marginRight: 50, flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 20}}
            onPress={() => {
              Share.share({
                message: 'When we stand united, Our Voice cannot be ignored!',
                url: 'https://ourvoiceusa.org/our-voice-app/',
                title: 'Our Voice'
              }, {
                // Android only:
                dialogTitle: 'Give someone a voice!',
              });
            }}>
            <Icon name="share" size={18} />
            <Text style={{marginLeft: 10}}>Share Our Voice!</Text>
          </TouchableOpacity>
        </View>

        <Text style={{margin: 5, fontSize: 18, color: 'black', fontWeight: 'bold'}}>
          Our Mission
        </Text>

        <Text style={{margin: 15, fontSize: 18, color: 'dimgray'}}>
          We are committed to level the political landscape. For too long, money
          has had a corrupting influence in politics. We believe that by providing
          all citizens easy-to-use tools, such as this mobile app, an informed
          electorate will emerge prepared to vote wisely and bypass the financial
          barriers to running for office themselves.
        </Text>

        <View style={{marginLeft: 50, marginRight: 50, flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
          <TouchableOpacity
            style={{backgroundColor: '#85bb65', flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 20}}
            onPress={() => {this.openDonate()}}>
            <Text>Donate <Icon name="dollar" size={18} color="green" />
            <Icon name="dollar" size={18} color="green" /> to Our Voice!</Text>
          </TouchableOpacity>
        </View>

        <Text style={{margin: 5, fontSize: 18, color: 'black', fontWeight: 'bold'}}>
            This App
        </Text>

        <Text style={{margin: 15, fontSize: 18, color: 'dimgray'}}>
          This mobile app is open source! Your code contribution is welcome.
          Our goal is to update occasionally with new features that help every day
          people get involved with the political process.
        </Text>

        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
          <Text style={{fontSize: 18, color: 'dimgray'}}>
            Installed Version:
          </Text>
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
          <Text style={{fontSize: 18, color: 'dimgray'}}>
            {DeviceInfo.getVersion()}
          </Text>
        </View>

        <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15}}>
          <Text style={{fontSize: 18, color: 'dimgray'}}>
            Find the source code on GitHub:
          </Text>
        </View>

        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
          <Text style={{fontSize: 16, fontWeight: 'bold', color: 'blue'}} onPress={() => {this.openGitHub('OVMobile')}}>
            https://github.com/OurVoiceUSA/OVMobile
          </Text>
        </View>

        <Text style={{margin: 15, fontSize: 18, color: 'dimgray'}}>
          Data for this app comes from various public APIs that provide civic information.
        </Text>

        <Text style={{margin: 5, fontSize: 18, color: 'black', fontWeight: 'bold'}}>
            You
        </Text>

        <Text style={{margin: 15, fontSize: 18, color: 'dimgray'}}>
          No matter your political views - your voice matters! Speak it to the world
          by sharing this app with your family and friends. Together, let us raise
          our demands so loud that the people in power can no longer ignore us.
        </Text>

      </ScrollView>
    );
  }
}
