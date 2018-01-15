import React, { PureComponent } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ListView,
  Linking,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  View,
  Image,
} from 'react-native';

import Modal from 'react-native-simple-modal';
import SmLoginPage from '../SmLoginPage';
import Icon from 'react-native-vector-icons/FontAwesome';
import { _getJWT, _apiCall } from '../../common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      SmLoginScreen: false,
      numberReturn: null,
      loading: false,
      office: props.navigation.state.params.office,
      profile: props.navigation.state.params.profile,
      ratings: props.navigation.state.params.profile.ratings,
      location: props.navigation.state.params.location,
      asked2update: false,
    };

  }

  _loginPing = async () => {
    var user = await _getJWT(true);
    if (user !== null) {
      this.setState({user: user});
      if (user.loggedin) this._doTheRate(null);
    }
  }

  componentDidMount() {
    this._loginPing();
  }

  componentDidUpdate(prevProps, prevState) {
    const { SmLoginScreen, user, numberReturn } = this.state;
    if (prevState.SmLoginScreen && !SmLoginScreen && user.loggedin && numberReturn) {
      // lots of state updates in these calls - do it outside of componentDidUpdate
      setTimeout(() => { 
        this._doTheRate(numberReturn);
        this.setState({numberReturn: null});
      }, 500);
    }
  }

  openFacebook = (id) => this.openURL('https://www.facebook.com/'+id);
  openTwitter = (id) => this.openURL('https://twitter.com/'+id);
  openWikipedia = (id) => this.openURL('https://wikipedia.org/wiki/'+id);
  openWebsite = (id) => this.openURL(id);
  openYoutube = (profile) => {
    if (profile.youtube_id)
      return this.openURL('https://youtube.com/channel/'+profile.youtube_id);
    if (profile.youtube)
      return this.openURL('https://youtube.com/user/'+profile.youtube);
  }

  openURL = (url) => {
    return Linking.openURL(url).catch(() => null);
  }

  _doTheRate = async (number) => {
    const { profile, location, ratings, user, asked2update } = this.state;
    if (number && !user.loggedin) {
      this.setState({SmLoginScreen: true, numberReturn: number});
    } else {
      if (!ratings.user || ratings.user != number) {
        this.setState({loading: true});
        var input = { politician_id: profile.id, lng: location.longitude, lat: location.latitude };
        if (number) input.rating = number;
        try {
          var blah = await _apiCall('/api/protected/politician_rate', input);
          var json = JSON.parse(blah._bodyInit);
          this.setState({ratings: json});
        } catch (error) {
          console.warn(error);
        }
      }
    }
    this.setState({loading: false});
    if (number && user.loggedin && (!user.profile.party || !user.profile.home_address) && asked2update === false) {
      this.setState({asked2update: true});
      Alert.alert(
        'Tell Us About You',
        'Thanks for rating a politician! In order to provide you with the most accurate and useful rating information, please update your profile.',
        [
          {text: 'Update Profile', onPress: () => {
            this.props.navigation.navigate('AboutYou');
          }},
          {text: 'Maybe later'},
        ], { cancelable: false }
      );
    }
  }

  _starRatingColor(number, rating) {
    const { profile } = this.state;

    if (number <= Math.ceil(rating))
      return '#FFD700';

    return '#e3e3e3';
  }

  partyNameFromKey(party) {
    switch (party) {
      case 'D': return 'Democrat';
      case 'R': return 'Republican';
      case 'I': return 'Independent';
      case 'G': return 'Green';
      case 'L': return 'Libertarian';
      default: return '';
    }
  }

  render() {

    const { office, user, pic_url, profile, ratings, SmLoginScreen, loading } = this.state;

    var star_rating = ratings.user;

    var profilePic;
    var polPic;
    var polPicFallback;
    var starArea;

    if (profile.bioguide_id) {
      polPic = {uri: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/'+profile.bioguide_id+'.jpg'};
    } else if (profile.govtrack_id) {
      polPic = {uri: 'https://www.govtrack.us/data/photos/'+profile.govtrack_id+'-200px.jpeg'};
    } else if (profile.photo_url) {
      polPic = {uri: profile.photo_url.replace('http:','https:')};
    } else {
      if (profile.gender == 'F')
        polPic = require('../../../img/nopic_female.png');
      else
        polPic = require('../../../img/nopic_male.png');
    }

    if (user && ratings.msg) {
      starArea = (<Text>{ratings.msg}</Text>);
    } else {
      starArea = (
        <View style={{alignItems: 'center'}}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{fontSize: 16}}>
              {(star_rating ? 'Your rating for this politician:' : 'Rate this politician:')}
            </Text>
          </View>
          <View style={{alignItems: 'center', flexDirection: 'row'}}>
            {(loading ? (<ActivityIndicator size="large" />) : (<Icon style={{margin: 10}} name="star" size={30} color={this._starRatingColor(1, star_rating)} onPress={() => {this._doTheRate(1)}}  />))}
            {(loading ? (<ActivityIndicator size="large" />) : (<Icon style={{margin: 10}} name="star" size={30} color={this._starRatingColor(2, star_rating)} onPress={() => {this._doTheRate(2)}}  />))}
            {(loading ? (<ActivityIndicator size="large" />) : (<Icon style={{margin: 10}} name="star" size={30} color={this._starRatingColor(3, star_rating)} onPress={() => {this._doTheRate(3)}}  />))}
            {(loading ? (<ActivityIndicator size="large" />) : (<Icon style={{margin: 10}} name="star" size={30} color={this._starRatingColor(4, star_rating)} onPress={() => {this._doTheRate(4)}}  />))}
            {(loading ? (<ActivityIndicator size="large" />) : (<Icon style={{margin: 10}} name="star" size={30} color={this._starRatingColor(5, star_rating)} onPress={() => {this._doTheRate(5)}}  />))}
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}} contentContainerStyle={{flexGrow:1}}>

        <View style={{flexDirection: 'row', alignItems: 'flex-start', margin: 10, marginBottom: 0}}>
          <View style={{height: 150, marginRight: 10}}>
            <Image resizeMode={'contain'} style={{flex: 1, width: Dimensions.get('window').width/3}} source={polPic} />
          </View>

          <View style={{flex: 1}}>
            <Text style={{fontSize: 25}} selectable={true}>
              {profile.first_name + ' ' + profile.last_name}
            </Text>
            <Text style={{fontSize: 18}} selectable={true}>
              {(office?office.state + ' ' + office.name + (office.district ? ' District ' + office.district : ''):'')}
            </Text>
            <Text style={{fontSize: 18}} selectable={true}>
              {this.partyNameFromKey(profile.party)}
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

        <View style={{margin: 15, marginBottom: 0, marginTop: 0, flexDirection: 'row'}}>
                <Text style={{fontSize: 14, textAlign: 'center'}}>We currently aren't aware of who is challenging this politican in the next primary.</Text>
        </View>

        <View style={{margin: 15, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 20}}
            onPress={() => {
              this.openURL(
                "https://docs.google.com/forms/d/e/1FAIpQLSfmtSKEZh66HLNpkvOIg4W4MbFOIvklGBwweuExsQCL0P11FQ/viewform?usp=pp_url"
                +"&entry.839337160="+office.state
                +"&entry.883929373="+((office.type == "sen" || office.type == "rep")?"Federal":"State")
                +"&entry.1678115432="+office.name
                +(office.district?"&entry.1511558516="+office.district:"")
              );
            }}>
            <Text style={{textAlign: 'center'}}>If you know anyone who is running against this politican, tap here to tell us.</Text>
          </TouchableOpacity>
        </View>

        <View style={{alignItems: 'center'}}>
          {starArea}
        </View>

        <View style={{margin: 5, marginLeft: 20, marginRight: 20, alignItems: 'center'}}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{fontSize: 16}}>
              User Ratings of this Politician:
            </Text>
          </View>
        </View>

        <View style={{marginLeft: 20, marginRight: 20, alignItems: 'center'}}>
          <View style={{flex: 1, alignItems: 'center'}}>
            <View style={{flex: 1, flexDirection: 'row'}}>
              <View style={{marginRight: 5}}>
                <Text style={{fontSize: 13, textDecorationLine: 'underline'}}>Party</Text>
                <Text style={{fontSize: 13}}>Democrats:</Text>
                <Text style={{fontSize: 13}}>Republicans:</Text>
                <Text style={{fontSize: 13}}>Independents:</Text>
                <Text style={{fontSize: 13}}>Greens:</Text>
                <Text style={{fontSize: 13}}>Libertarians:</Text>
                <Text style={{fontSize: 13}}>Other:</Text>
              </View>
              <View style={{marginRight: 5}}>
                <Text style={{fontSize: 13, textDecorationLine: 'underline'}}>Constituents</Text>
                <Text style={{fontSize: 13}}>{(ratings.D.rating?ratings.D.rating.toFixed(1)+' ('+ratings.D.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.R.rating?ratings.R.rating.toFixed(1)+' ('+ratings.R.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.I.rating?ratings.I.rating.toFixed(1)+' ('+ratings.I.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.G.rating?ratings.G.rating.toFixed(1)+' ('+ratings.G.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.L.rating?ratings.L.rating.toFixed(1)+' ('+ratings.L.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.O.rating?ratings.O.rating.toFixed(1)+' ('+ratings.O.total+')':'N/A')}</Text>
              </View>
              <View>
                <Text style={{fontSize: 13, textDecorationLine: 'underline'}}>Outside District</Text>
                <Text style={{fontSize: 13}}>{(ratings.outsider.D.rating?ratings.outsider.D.rating.toFixed(1)+' ('+ratings.outsider.D.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.outsider.R.rating?ratings.outsider.R.rating.toFixed(1)+' ('+ratings.outsider.R.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.outsider.I.rating?ratings.outsider.I.rating.toFixed(1)+' ('+ratings.outsider.I.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.outsider.G.rating?ratings.outsider.G.rating.toFixed(1)+' ('+ratings.outsider.G.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.outsider.L.rating?ratings.outsider.L.rating.toFixed(1)+' ('+ratings.outsider.L.total+')':'N/A')}</Text>
                <Text style={{fontSize: 13}}>{(ratings.outsider.O.rating?ratings.outsider.O.rating.toFixed(1)+' ('+ratings.outsider.O.total+')':'N/A')}</Text>
              </View>
            </View>
          </View>
        </View>

        <Modal
          open={SmLoginScreen}
          modalStyle={{width: 335, height: 400, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({SmLoginScreen: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <SmLoginPage refer={this} />
        </Modal>

      </ScrollView>

    );
  }

}


