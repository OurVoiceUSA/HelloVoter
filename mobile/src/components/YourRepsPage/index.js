import React, { PureComponent } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  FlatList,
  Linking,
  TouchableOpacity,
} from 'react-native';

import LocationComponent from '../LocationComponent';

import Icon from 'react-native-vector-icons/FontAwesome';
import RNGooglePlaces from 'react-native-google-places';
import Modal from 'react-native-simple-modal';
import DisplayRep from './display-rep';
import { wsbase } from '../../config'
import { Divider, translate, _apiCall, _loginPing, _doGeocode, _saveUser, _specificAddress } from '../../common';

export default class App extends LocationComponent {

  locationIcon = null;

  constructor(props) {
    super(props);
    this.state = {
      awaitPosition: false,
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
    const { awaitPosition, myPosition, user } = this.state;
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
    if (awaitPosition === true &&
      myPosition.longitude !== undefined && myPosition.latitude !== undefined &&
      prevState.myPosition.longitude !== myPosition.longitude &&
      prevState.myPosition.latitude !== myPosition.latitude) {
      this.doGeocode(myPosition.longitude, myPosition.latitude);
      this.setState({ awaitPosition: false });
    }
  }

  componentWillUnmount() {
    this.cleanupLocation();
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

      let res = await _apiCall('/api/v1/whorepme?lng='+position.longitude+'&lat='+position.latitude, {address: position.address});
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
            translate("ambiguous_address"),
            translate("no_guarantee_district"),
            [
              {text: translate("continue_anyway"), onPress: () => {
                place.icon = this.locationIcon;
                this._whorepme(place);
              }},
              {text: translate("cancel")}
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

  doGeocode = async (lng, lat) => {
    let position = await _doGeocode(lng, lat);
    this._whorepme(position);
    this.cleanupLocation();
  }

  doCurrentLocation = async () => {
    this.setState({
      loading: true,
      modalIsOpen: false,
      myPosition: {icon: 'map-marker'},
      awaitPosition: true,
    });

    let access = await this.requestLocationPermission();
    if (access) return;

    this.setState({loading: false, myPosition: {icon: 'map-marker', address: translate("location_access_denied"), error: true}, apiData: null});
    Alert.alert(translate("current_location"), translate("howto_use_current_location"), [{text: translate("ok")}], { cancelable: false });
  }

  email = async (email) => {
    const url = 'mailto:' + email;
    return Linking.openURL(url).catch(() => {
      Alert.alert(translate("app_error"), translate("unable_to_launch_external"), [{text: translate("ok")}], { cancelable: false })
    });
  }

  render() {
    const { user, loading, apiData, myPosition, modalIsOpen } = this.state;

    if (apiData && !apiData.msg) {

      if (apiData.cd.length == 0) {
        var nodata = {key: 1, title: translate("us_house_of_reps")};
        apiData.cd.push(nodata);
      }

      if (apiData.sen.length == 0) {
        var nodata = {key: 1, title: translate("us_senate")};
        apiData.sen.push(nodata);
      }

      if (apiData.sldl.length == 0) {
        var nodata = {key: 1, title: translate("sldl")};
        apiData.sldl.push(nodata);
      }

      if (apiData.sldu.length == 0) {
        var nodata = {key: 1, title: translate("sldu")};
        apiData.sldu.push(nodata);
      }

      if (apiData.other.length == 0) {
        var nodata = {key: 1, title: translate("state_local_offials")};
        apiData.other.push(nodata);
      }

    }

    switch(myPosition.icon) {
      case 'map-marker': basedOnYour = translate("approximate_address"); break;
      case 'home': basedOnYour = translate("home_address"); break;
      case 'map-signs': basedOnYour = translate("searched_address"); break;
      default: basedOnYour = "..";
    }

    return (

      <ScrollView style={{flex: 1, backgroundColor: 'white'}} contentContainerStyle={{flexGrow:1}}>

        <Divider />

        {myPosition.icon &&
        <View style={{margin: 10}}>
          <TouchableOpacity
            style={{margin: 0, backgroundColor: '#d7d7d7', padding: 10}}
            onPress={() => {this.setState({modalIsOpen: true})}}>
          <View style={{flexDirection: 'row', marginBottom: 5}}>
            <Text>{translate("based_on_your")} {basedOnYour}. {translate("tap_to_change")}</Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Icon style={{marginRight: 10}} name={myPosition.icon} size={20} color="black" />
            {myPosition.address &&
            <Text style={{fontStyle: (myPosition.error?'italic':'normal')}}>{myPosition.address}</Text>
            ||
            <View style={{flexDirection: 'row'}}>
            <ActivityIndicator />
            <Text style={{fontStyle: 'italic'}}> {translate("loading_address")}</Text>
            </View>
            }
          </View>
          </TouchableOpacity>
        </View>
        }

        {loading &&
        <View style={{flex: 1}}>
          <View style={{flex: 1, margin: 10, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontSize: 18, textAlign: 'center', marginBottom: 10}}>{translate("loading_district_information")}</Text>
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
          <FlatList
            scrollEnabled={false}
            data={apiData.cd}
            renderItem={({item}) =>
              <DisplayRep
                navigation={this.props.navigation}
                office={item}
                location={myPosition}
                />
            }
          />

          <FlatList
            scrollEnabled={false}
            data={apiData.sen}
            renderItem={({item}) =>
              <DisplayRep
                navigation={this.props.navigation}
                office={item}
                location={myPosition}
                />
            }
          />

          <FlatList
            scrollEnabled={false}
            data={apiData.sldl}
            renderItem={({item}) =>
              <DisplayRep
                navigation={this.props.navigation}
                office={item}
                location={myPosition}
                />
            }
          />

          <FlatList
            scrollEnabled={false}
            data={apiData.sldu}
            renderItem={({item}) =>
              <DisplayRep
                navigation={this.props.navigation}
                office={item}
                location={myPosition}
                />
            }
          />

          <FlatList
            scrollEnabled={false}
            data={apiData.other}
            renderItem={({item}) =>
              <DisplayRep
                navigation={this.props.navigation}
                office={item}
                location={myPosition}
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
            <Text style={{fontSize: 18, textAlign: 'center', marginBottom: 10}}>{translate("show_representatives_by")}:</Text>
            <TouchableOpacity
              style={{margin: 10, flexDirection: 'row', backgroundColor: '#d7d7d7', alignItems: 'center', padding: 10}}
              onPress={this.doCurrentLocation}>
              <Icon style={{marginRight: 15}} name="map-marker" size={20} color="black" />
              <Text style={{textAlign: 'center'}}>{translate("current_location")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{margin: 10, flexDirection: 'row', backgroundColor: '#d7d7d7', alignItems: 'center', padding: 10}}
              onPress={this._useHomeAddress}>
              <Icon style={{marginRight: 15}} name="home" size={20} color="black" />
              <Text style={{textAlign: 'center'}}>{translate("home_address_cap")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{margin: 10, flexDirection: 'row', backgroundColor: '#d7d7d7', alignItems: 'center', padding: 10}}
              onPress={this._useCustomAddress}>
              <Icon style={{marginRight: 15}} name="map-signs" size={20} color="black" />
              <Text style={{textAlign: 'center'}}>{translate("searched_address_cap")}</Text>
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
    fontSize: 22,
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
