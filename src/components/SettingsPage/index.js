
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Text,
  View,
  ScrollView,
  Image,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

import { NavigationActions } from 'react-navigation'
import Permissions from 'react-native-permissions';
import RNGooglePlaces from 'react-native-google-places';
import ModalPicker from 'react-native-modal-selector';
import Modal from 'react-native-simple-modal';
import Icon from 'react-native-vector-icons/FontAwesome';
import SmLoginPage from '../SmLoginPage';
import storage from 'react-native-storage-wrapper';
import { google_api_key } from '../../config';
import { _getJWT, _rmJWT, _saveUser, _rmUser, _apiCall, _specificAddress } from '../../common';

const party_data = [
  { key: 0, label: 'Party Affiliation', section: true },
  { key: 'D', label: 'Democrat' },
  { key: 'R', label: 'Republican' },
  { key: 'I', label: 'Independent' },
  { key: 'G', label: 'Green' },
  { key: 'L', label: 'Libertarian' },
  { key: 'O', label: 'Other' },
];

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      SmLoginScreen: false,
      profileUpdate: false,
      surveyComplete: false,
      surveyPartial: false,
      user: null,
      party: null,
      myPosition: { address: null, longitude: null, latitude: null },
      permissionLocation: null,
      permissionNotification: null,
    };

  }

  _logout() {
    const resetAction = NavigationActions.reset({
      index: 0,
      actions: [
        NavigationActions.navigate({ routeName: 'HomeScreen'})
      ]
    });
    _rmJWT();
    _rmUser();
    this.props.navigation.dispatch(resetAction);
  }

  _loadProfile = async () => {
    var user = await _getJWT(true);
    if (user) {
      this.setState({
        user: user,
        party: user.profile.party,
        myPosition: {
          address: user.profile.home_address,
          longitude: user.profile.home_lng,
          latitude: user.profile.home_lat
        },
      });
    }
  }

  _updateProfile = async () => {
    const { party, partyOld, myPosition, myPositionOld } = this.state;
    let { user } = this.state;
    if (party !== partyOld || (myPositionOld && myPosition.address !== myPositionOld.address)) {
      user.profile.party = party;
      user.profile.home_address = myPosition.address;
      user.profile.home_lng = myPosition.longitude;
      user.profile.home_lat = myPosition.latitude;
      if (user.lastsearchpos && user.lastsearchpos.icon == 'home') {
        user.lastsearchpos = myPosition;
        user.lastsearchpos.icon = 'home';
      }
      _saveUser(user, true);
      this.setState({user: user});
    }
    this.setState({profileUpdate: false});
  }

  _partyName(party) {
    for (let i = 0; i < party_data.length; i++) {
      if (party_data[i].key == party) return party_data[i].label;
    }
    return '';
  }

  componentDidMount() {
    this.checkPermissionLocation();
    this.checkPermissionNotification();
    this.loadSurveyData();
    this._loadProfile();
  }

  componentDidUpdate(prevProps, prevState) {
    const { profileUpdate, SmLoginScreen, party, myPosition } = this.state;

    if (profileUpdate)
      this._updateProfile(); 

    if (prevState.SmLoginScreen && !SmLoginScreen)
      setTimeout(() => {this._loadProfile();}, 500);

  }

  checkPermissionLocation = async () => {
    let access = false;
    try {
      res = await Permissions.check('location');
      if (res === "authorized") access = true;
    } catch(error) {
      // nothing we can do about it
    }
    this.setState({permissionLocation: access});
  }

  checkPermissionNotification = async () => {
    let access = false;
    try {
      res = await Permissions.check('notification');
      if (res === "authorized") access = true;
    } catch(error) {
      // nothing we can do about it
    }
    this.setState({permissionNotification: access});
  }

  loadSurveyData = async () => {
    try {
      let data = await storage.get('OV_SURVEY@0')
      if (data !== null) {
        let answered = 0;
        let surveys = JSON.parse(data);
        for (let i = 0; i < surveys[0].survey.length; i++) {
          if (surveys[0].survey[i].value !== "") answered++;
        }
        if (answered >= 25) this.setState({surveyComplete: true});
        else this.setState({surveyPartial: true});
      }
    } catch (error) {
      console.warn(error);
    }
  }

  sessionExpired() {
    Alert.alert('Logged Out', 'Your login session has expired. Please login again to update your profile.', [{text: 'OK'}], { cancelable: false });
  }

  render() {
    const { user, permissionLocation, permissionNotification, SmLoginScreen, surveyComplete, surveyPartial, party, myPosition } = this.state;
    const { navigate } = this.props.navigation;

    // wait for user object to become available
    if (!user) return (
        <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20}}>Loading profile information...</Text>
          <ActivityIndicator />
        </View>
      );

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}}>

        <View style={{flexDirection: 'row', margin: 20, marginBottom: 10}}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon style={{marginRight: 10}} name="user-plus" size={18} color="black" />
              <Text style={{fontSize: 20}}>Login Status:</Text>
            </View>
          </View>
          {user.loggedin &&
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Active</Text>
            <Icon name="check-circle" size={30} color="green" />
          </View>
          || user.lastsmlogin &&
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Session Expired</Text>
            <Icon name="exclamation-triangle" size={30} color="orange" />
          </View>
          ||
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Not Logged In</Text>
            <Icon name="times-circle" size={30} color="red" />
          </View>
          }
        </View>

        {!user.loggedin &&
        <View style={{flex: 1, alignItems: 'center', marginBottom: 10}}>
          <TouchableOpacity
            style={{flexDirection: 'row', padding: 10, alignItems: 'center', backgroundColor: '#d7d7d7'}}
            onPress={() => {this.setState({SmLoginScreen: true})}}>
            <Text>Tap to Log In</Text>
          </TouchableOpacity>
        </View>
        }

        {user.loggedin &&
        <View style={{flexDirection: 'row', margin: 20, marginTop: 0, marginBottom: 10, alignItems: 'center'}}>
          <View style={{marginRight: 20}}>
            <Image source={{ uri: user.avatar }} style={{height: 50, width: 50, borderRadius: 20}} />
          </View>
          <View style={{flex: 1}}>
            <Text>Welcome, {user.name}!</Text>
          </View>
        </View>
        || user.lastsmlogin &&
        <View style={{flexDirection: 'row', margin: 20, marginTop: 0, marginBottom: 10}}>
          <View style={{marginRight: 20}}>
            <Image source={{ uri: user.avatar }} style={{height: 50, width: 50, borderRadius: 20}} />
          </View>
          <View style={{flex: 1}}>
            <Text>
              Welcome back! You are signed out; for the best user experience, please login again.
            </Text>
          </View>
        </View>
        ||
        <View style={{flexDirection: 'row', margin: 20, marginTop: 0, marginBottom: 10}}>
          <Text>
            For the best user experience, login with a social media account.
            However, it is not required for most app functions.
          </Text>
        </View>
        }

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{flexDirection: 'row', margin: 20, marginBottom: 10}}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon style={{marginRight: 10}} name="home" size={22} color="black" />
              <Text style={{fontSize: 20}}>Home Address:</Text>
            </View>
          </View>
          {myPosition.address && !_specificAddress(myPosition.address) &&
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Ambiguous</Text>
            <Icon name="exclamation-triangle" size={30} color="orange" />
          </View>
          || myPosition.address &&
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Set</Text>
            <Icon name="check-circle" size={30} color="green" />
          </View>
          ||
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Not Set</Text>
            <Icon name="times-circle" size={30} color="red" />
          </View>
          }
        </View>

        <View style={{flex: 1, alignItems: 'center', marginBottom: 10}}>
          {user.lastsmlogin && !user.loggedin &&
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12}}
            onPress={this.sessionExpired}>
            <Text>{(myPosition.address?myPosition.address:'Tap to set address')}</Text>
          </TouchableOpacity>
          ||
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12}}
            onPress={() => {
              RNGooglePlaces.openAutocompleteModal()
              .then((place) => {
                if (!_specificAddress(place.address)) {
                  setTimeout(() => {
                    Alert.alert(
                      'Ambiguous Address',
                      'Unfortunately we can\'t guarantee accurate district results without a whole address.',
                      [
                        {text: 'Continue Anyway', onPress: () => {
                          this.setState({
                            profileUpdate: true,
                            myPositionOld: myPosition,
                            myPosition: place,
                          });
                        }},
                        {text: 'Cancel'}
                      ], { cancelable: false }
                    );
                  }, 500);
                } else {
                  this.setState({
                    profileUpdate: true,
                    myPositionOld: myPosition,
                    myPosition: place,
                  });
                }
              })
              .catch(error => console.log(error.message));
            }}>
            <Text style={{textAlign: 'center'}}>
              {(myPosition.address?myPosition.address:'Tap to set address')}
            </Text>
          </TouchableOpacity>
          }
        </View>

        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
          <Text>
            We use your home address to give you information most relevant to you.
            You may simply enter a city or a state, but we cannot guarantee
            accurate district results without a whole address.
          </Text>
        </View>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{flexDirection: 'row', margin: 20, marginBottom: 0}}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon style={{marginRight: 10}} name="group" size={18} color="black" />
              <Text style={{fontSize: 20}}>Party Affiliation:</Text>
            </View>
          </View>
          {party &&
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Set</Text>
            <Icon name="check-circle" size={30} color="green" />
          </View>
          ||
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Not Set</Text>
            <Icon name="times-circle" size={30} color="red" />
          </View>
          }
        </View>

        <View style={{flex: 1, alignItems: 'center'}}>
          <View style={{margin: 5}}>
            {user.lastsmlogin && !user.loggedin &&
            <TouchableOpacity
              style={{backgroundColor: '#d7d7d7', flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12}}
              onPress={this.sessionExpired}>
              <Text>{(party?this._partyName(party):'Tap to set party')}</Text>
            </TouchableOpacity>
            ||
            <ModalPicker
              style={{backgroundColor: '#d7d7d7', flexDirection: 'row', alignItems: 'center'}}
              data={party_data}
              initValue={(party?this._partyName(party):'Tap to set party')}
              onChange={(option) => {
                this.setState({
                  profileUpdate: true,
                  partyOld: party,
                  party: option.key
                });
              }} />
            }
          </View>
        </View>

        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
          <Text>
             We use your party affiliation to better categorize information for you.
             If not set, we assume you are an Independent.
          </Text>
        </View>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

{/*
        <View style={{flexDirection: 'row', margin: 20, marginBottom: 10}}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon style={{marginRight: 10}} name="bank" size={18} color="black" />
              <Text style={{fontSize: 20}}>Political Views:</Text>
            </View>
          </View>
          {surveyComplete &&
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Complete</Text>
            <Icon name="check-circle" size={30} color="green" />
          </View>
          || surveyPartial &&
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Incomplete</Text>
            <Icon name="exclamation-circle" size={30} color="orange" />
          </View>
          ||
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Not Started</Text>
            <Icon name="times-circle" size={30} color="red" />
          </View>
          }
        </View>

        <View style={{flex: 1, alignItems: 'center'}}>
            <TouchableOpacity
              style={{flexDirection: 'row', padding: 10, alignItems: 'center', backgroundColor: '#d7d7d7'}}
              onPress={() => {navigate('Survey', {refer: this, userId: 0, pinId: 0})}}>
              <Text>Take Survey</Text>
            </TouchableOpacity>
        </View>

        <View style={{flexDirection: 'row', margin: 20, marginTop: 10}}>
          <Text>
             We use your selections on the various policy issues to identify politicans
             who most closely align with your world view.
          </Text>
        </View>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />
*/}

        <View style={{flexDirection: 'row', margin: 20, marginBottom: 10}}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon style={{marginRight: 10}} name="map-marker" size={22} color="black" />
              <Text style={{fontSize: 20}}>Location Permissions:</Text>
            </View>
          </View>
          {permissionLocation &&
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>On</Text>
            <Icon name="check-circle" size={30} color="green" />
          </View>
          ||
          <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}
              onPress={() => {Alert.alert('Location Permissions', 'Enable location permissions for this app in your device ettings.', [{text: 'OK'}], { cancelable: false })}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Off</Text>
            <Icon name="times-circle" size={30} color="red" />
          </TouchableOpacity>
          }
        </View>
        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
          <Text>
            We use your device's location when you select the "current location"
            option when searching representatives.
          </Text>
        </View>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{flexDirection: 'row', margin: 20}}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon style={{marginRight: 10}} name="exclamation-circle" size={22} color="black" />
              <Text style={{fontSize: 20}}>Push Notifications:</Text>
            </View>
          </View>
          {permissionNotification &&
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>On</Text>
            <Icon name="check-circle" size={30} color="green" />
          </View>
          ||
          <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}
              onPress={() => {Alert.alert('Push Notifications', 'Enable push notifications for this app in your device settings.', [{text: 'OK'}], { cancelable: false })}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Off</Text>
            <Icon name="times-circle" size={30} color="red" />
          </TouchableOpacity>
          }
        </View>

        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
          <Text>
            Based on your home address and party settings, we may push
            notifications to your device when there is an upcoming caucus
            or election that may be relevant to you.
          </Text>
        </View>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{flexDirection: 'row', margin: 20}}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon style={{marginRight: 10}} name="folder-open" size={22} color="black" />
              <Text style={{fontSize: 20}}>App Data:</Text>
            </View>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
            <Text style={{marginRight: 7, fontWeight: 'bold'}}>Ok</Text>
            <Icon name="check-circle" size={30} color="green" />
          </View>
        </View>
        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
          {!user.lastsmlogin &&
          <Text>
            We save your profile to your device. Clearing your profile will remove
            all data for this app from your device.
          </Text>
          ||
          <Text>
            We save your profile to your device, even when you are not logged in.
            Logging out will remove all profile data for this app from your device.
            Logging in again will restore your profile.
          </Text>
          }
        </View>

        <View style={{flex: 1, alignItems: 'center'}}>
          <View style={{margin: 20, marginTop: 0}}>
            <TouchableOpacity
              style={{flexDirection: 'row', padding: 10, alignItems: 'center', backgroundColor: '#d7d7d7'}}
              onPress={() => {
                Alert.alert(
                  (user.lastsmlogin ? 'Log Out' : 'Clear Data'),
                  (user.lastsmlogin ? 'Are you sure you wish to log out?' : 'Are you sure you wish to clear your profile data? This action cannot be undone.'),
                  [
                    {text: 'Yes', onPress: () => {this._logout()}},
                    {text: 'No'}
                  ], { cancelable: false });
              }}>
              <Icon style={{width: 20}} name="sign-out" size={22} color="black" />
              <Text style={{marginLeft: 10, fontSize: 16}}>{(user.lastsmlogin ? 'Log Out' : 'Clear Data')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          open={SmLoginScreen}
          modalStyle={{width: 335, height: 400, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
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
