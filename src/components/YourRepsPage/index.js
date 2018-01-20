import React, { PureComponent } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  DeviceEventEmitter,
  PermissionsAndroid,
  Platform,
  Text,
  View,
  FlatList,
  Linking,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import Permissions from 'react-native-permissions';
import RNGLocation from 'react-native-google-location';
import RNGooglePlaces from 'react-native-google-places';
import Modal from 'react-native-simple-modal';
import DisplayRep from './display-rep';
import { wsbase } from '../../config'
import { _apiCall, _loginPing, _doGeocode, _saveUser, _specificAddress } from '../../common';

export default class App extends PureComponent {

  locationIcon = null;

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      user: null,
      apiData: null,
      myPosition: {
        address: null,
        longitude: null,
        latitude: null,
        icon: null,
        error: false,
      },
      modalIsOpen: false,
    };
  }

  componentDidMount() {
    _loginPing(this, false);
  }

  componentDidUpdate(prevProps, prevState) {
    const { user } = this.state;
    if (!prevState.user && user && !user.profile.home_address) {
      this.setState({ loading: false, modalIsOpen: true });
    }
    if (!prevState.user && user && user.lastsearchpos) {
      if (user.lastsearchpos.icon == 'map-marker') {
        this.doCurrentLocation();
      } else {
        this._whorepme(user.lastsearchpos);
      }
    }
    if (!prevState.user && user && !user.lastsearchpos) {
      this.setState({ loading: false, modalIsOpen: true });
    }
  }

  componentWillUnmount() {
    if (Platform.OS === 'android' && this.evEmitter) {
      RNGLocation.disconnect();
      this.evEmitter.remove();
    }
  }

  _genericServiceError(error, msg) {
    this.setState({ loading: false, apiData: null });
    Alert.alert('Error', msg, [{text: 'OK'}], { cancelable: false });
    console.warn(error);
  }

  _whorepme = async (position) => {
    let { user } = this.state;

    this.setState({
      loading: true,
      myPosition: position,
      modalIsOpen: false,
    });

    var body = null;
    try {
      if (user) {
        user.lastsearchpos = position;
        if (position.icon == 'home' && !user.profile.home_address) {
          user.profile.home_address = position.address;
          user.profile.home_lng = position.longitude;
          user.profile.home_lat = position.latitude;
        }
        _saveUser(user, true);
      }

      let res = await _apiCall('/api/whorepme?lng='+position.longitude+'&lat='+position.latitude, {address: position.address});
      body = await res.json();

    } catch (error) {
      this._genericServiceError(error, "There was an error fetching data for this request.");
      console.warn(JSON.stringify(error));
    }

    this.setState({
      loading: false,
      user: user,
      apiData: body,
    });

  }

  _useHomeAddress = async () => {
    const { user } = this.state;

    if (user && user.profile.home_address && user.profile.home_lng && user.profile.home_lat) {
      this._whorepme({
        longitude: user.profile.home_lng,
        latitude: user.profile.home_lat,
        address: user.profile.home_address,
        icon: 'home',
      });
      return;
    }
    this.locationIcon = 'home';
    this.setState({loading: false});
    this.openAddressModal();
  }

  _useCustomAddress = async () => {
    this.locationIcon = 'map-signs';
    this.openAddressModal();
  }

  openAddressModal() {
    RNGooglePlaces.openAutocompleteModal()
    .then((place) => {
      if (!_specificAddress(place.address)) {
        setTimeout(() => {
          Alert.alert(
            'Ambiguous Address',
            'Unfortunately we can\'t guarantee accurate district results without a whole address.',
            [
              {text: 'Continue Anyway', onPress: () => {
                place.icon = this.locationIcon;
                this._whorepme(place);
              }},
              {text: 'Cancel'}
            ], { cancelable: false }
          );
        }, 500);
      } else {
        place.icon = this.locationIcon;
        this._whorepme(place);
      }
    })
    .catch(error => console.log(error.message));
  }

  onLocationChange (e: Event) {
    this.doGeocode(e.Longitude, e.Latitude);
  }

  getLocation() {
    navigator.geolocation.getCurrentPosition((position) => {
      this.doGeocode(position.coords.longitude, position.coords.latitude);
    },
    (error) => { this._genericServiceError(error, "Unable to retrieve your location from your device."); },
    { enableHighAccuracy: true, timeout: 2000, maximumAge: 1000 });
  }

  doGeocode = async (lng, lat) => {
    let position = await _doGeocode(lng, lat);

    this._whorepme(position);

    if (this.evEmitter) {
      RNGLocation.disconnect();
      this.evEmitter.remove();
      this.evEmitter = null;
    }
  }

  doCurrentLocation = async () => {
    this.setState({
      loading: true,
      modalIsOpen: false,
      myPosition: {icon: 'map-marker'},
    });
    access = false;
    try {
      res = await Permissions.request('location');
      if (res === "authorized") access = true;
    } catch(error) {
      // nothing we can do about it
    }
    if (access === true) {
      if (Platform.OS === 'android') {
        if (RNGLocation.available() === false) {
          this._genericServiceError(null, "Location services not available on your device.");
        } else {
          if (!this.evEmitter) {
            this.evEmitter = DeviceEventEmitter.addListener('updateLocation', this.onLocationChange.bind(this));
            RNGLocation.reconnect();
            RNGLocation.getLocation();
          }
        }
      } else {
        this.getLocation();
      }
      return;
    }
    this.setState({loading: false, myPosition: {icon: 'map-marker', address: 'location access denied', error: true}, apiData: null});
    Alert.alert('Current Location', 'To use your current location, go into your phone settings and enable location access for Our Voice.', [{text: 'OK'}], { cancelable: false });
  }

  email = async (email) => {
    const url = 'mailto:' + email;
    return Linking.openURL(url).catch(() => {
      Alert.alert('App Error', 'Unable to launch external application.', [{text: 'OK'}], { cancelable: false })
    });
  }

  render() {
    const { user, loading, apiData, myPosition, modalIsOpen } = this.state;

    if (apiData && !apiData.msg) {

      if (apiData.federal.offices.length == 0) {
        var nodata = {key: 1, nodata: true};
        apiData.federal.offices.push(nodata);
      }

      if (apiData.state.offices.length == 0) {
        var nodata = {key: 1, nodata: true};
        apiData.state.offices.push(nodata);
      }

      if (apiData.local.offices.length == 0) {
        var nodata = {key: 1, nodata: true};
        apiData.local.offices.push(nodata);
      }

    }

    switch(myPosition.icon) {
      case 'map-marker': basedOnYour = "approximate address"; break;
      case 'home': basedOnYour = "home address"; break;
      case 'map-signs': basedOnYour = "searched address"; break;
      default: basedOnYour = "..";
    }

    return (

      <ScrollView style={{flex: 1, backgroundColor: 'white'}} contentContainerStyle={{flexGrow:1}}>

        {myPosition.icon &&
        <View style={{margin: 10}}>
          <TouchableOpacity
            style={{margin: 0, backgroundColor: '#d7d7d7', padding: 10}}
            onPress={() => {this.setState({modalIsOpen: true})}}>
          <View style={{flexDirection: 'row', marginBottom: 5}}>
            <Text>Based on your {basedOnYour}. Tap to change.</Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Icon style={{marginRight: 10}} name={myPosition.icon} size={20} color="black" />
            {myPosition.address &&
            <Text style={{fontStyle: (myPosition.error?'italic':'normal')}}>{myPosition.address}</Text>
            ||
            <View style={{flexDirection: 'row'}}>
            <ActivityIndicator />
            <Text style={{fontStyle: 'italic'}}> loading address</Text>
            </View>
            }
          </View>
          </TouchableOpacity>
        </View>
        }

        {loading &&
        <View style={{flex: 1}}>
          <View style={{flex: 1, margin: 10, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontSize: 18, textAlign: 'center', marginBottom: 10}}>Loading district information.</Text>
            <ActivityIndicator />
          </View>
        </View>
        }

        {apiData && apiData.msg && !loading &&
        <View style={{flex: 1}}>
          <View style={{flex: 1, margin: 10, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={styles.centerscreen}>{apiData.msg}</Text>
          </View>
        </View>
        }

        {apiData && !apiData.msg && !loading &&
        <View>
        <Text style={styles.header}>Federal</Text>

        <FlatList
          scrollEnabled={false}
          data={apiData.federal.offices}
          renderItem={({item}) =>
            <DisplayRep
              navigation={this.props.navigation}
              office={item}
              location={myPosition}
              />
          }
          ItemSeparatorComponent={() =>
            <View style={{
                width: Dimensions.get('window').width,
                height: 1,
                backgroundColor: 'lightgray'
              }}
            />
          }
        />

        <Text style={styles.header}>State</Text>
        <FlatList
          scrollEnabled={false}
          data={apiData.state.offices}
          renderItem={({item}) =>
            <DisplayRep
              navigation={this.props.navigation}
              office={item}
              location={myPosition}
              />
          }
          ItemSeparatorComponent={() =>
            <View style={{
                width: Dimensions.get('window').width,
                height: 1,
                backgroundColor: 'lightgray'
              }}
            />
          }
        />

        <Text style={styles.header}>Local</Text>
        <FlatList
          scrollEnabled={false}
          data={apiData.local.offices}
          renderItem={({item}) =>
            <DisplayRep
              navigation={this.props.navigation}
              office={item}
              location={myPosition}
              />
          }
          ItemSeparatorComponent={() =>
            <View style={{
                width: Dimensions.get('window').width,
                height: 1,
                backgroundColor: 'lightgray'
              }}
            />
          }
        />

        <View style={{paddingBottom: 35}}>
        </View>
        </View>
        }

        <Modal
          open={modalIsOpen}
          modalStyle={{width: 335, height: 400, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({modalIsOpen: false})}
          closeOnTouchOutside={(apiData ? true : false)}
          disableOnBackPress={(apiData ? false : true)}>
          <View style={{backgroundColor: 'white', alignItems: 'center', padding: 40, borderRadius: 40, borderWidth: 10,
borderColor: '#d7d7d7'}}>
            <Text style={{fontSize: 18, textAlign: 'center', marginBottom: 10}}>Show Representatives by:</Text>
            <TouchableOpacity
              style={{margin: 10, flexDirection: 'row', backgroundColor: '#d7d7d7', alignItems: 'center', padding: 10}}
              onPress={this.doCurrentLocation}>
              <Icon style={{marginRight: 15}} name="map-marker" size={20} color="black" />
              <Text style={{textAlign: 'center'}}>Current Location</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{margin: 10, flexDirection: 'row', backgroundColor: '#d7d7d7', alignItems: 'center', padding: 10}}
              onPress={this._useHomeAddress}>
              <Icon style={{marginRight: 15}} name="home" size={20} color="black" />
              <Text style={{textAlign: 'center'}}>Home Address</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{margin: 10, flexDirection: 'row', backgroundColor: '#d7d7d7', alignItems: 'center', padding: 10}}
              onPress={this._useCustomAddress}>
              <Icon style={{marginRight: 15}} name="map-signs" size={20} color="black" />
              <Text style={{textAlign: 'center'}}>Search Address</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>
    );
  }
}

const iconStyles = {
  justifyContent: 'center',
  borderRadius: 10,
  padding: 10,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    margin: 20,
  },
  avatarImage: {
    borderRadius: 50,
    height: 100,
    width: 100,
  },
  centerscreen: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  header: {
    fontSize: 25,
    marginBottom: 10,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  text: {
    textAlign: 'center',
  },
  buttons: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    margin: 20,
    marginBottom: 30,
  },
});
