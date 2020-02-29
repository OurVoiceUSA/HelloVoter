import React, { PureComponent } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Card, CardItem, Content, Text, Body, Button, Spinner } from 'native-base';

import LocationComponent from '../../LocationComponent';
import { HVConfirmDialog } from '../../HVComponent';
import DisplayRep from './DisplayRep';
import PolProfile from './PolProfile';
import { wsbase, google_api_key } from '../../config'

import Icon from 'react-native-vector-icons/FontAwesome';
import RNGooglePlaces from 'react-native-google-places';
import { Dialog } from 'react-native-simple-dialogs';
import { Divider, say, _apiCall, _loginPing, _doGeocode, _saveUser, _specificAddress } from '../../common';

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
      polProfile: false,
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
    this.setState(
      { modalIsOpen: false, confirmDialog: false, loading: false, apiData: null },
      this.alert('Error', msg)
    );
    console.warn(error);
  }

  _whorepme = async (position) => {
    let { user } = this.state;
    let res;

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

      let lng = position.longitude;
      let lat = position.latitude;
      let address = position.address;

      let url = "https://www.googleapis.com/civicinfo/v2/representatives"+
        "?key="+google_api_key+
        "&address="+(address?address:lat+","+lng);

        res = await fetch(url, {compress: true});
        body = await res.json();
        if (body.error) {
          throw "API returned an error";
        }

    } catch (error) {
      this._genericServiceError(error, "There was an error fetching data for this request.");
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
      setTimeout(() => {
        if (!_specificAddress(place.address)) {
          this.setState({modalIsOpen: false});
          this.alert(
            say("ambiguous_address"),
            say("no_guarantee_district"),
            {
              title: say("continue_anyway"),
              onPress: () => {
                this.setState({confirmDialog: false});
                place.icon = this.locationIcon;
                this._whorepme(place);
              },
            },
            {
              title: say("cancel"),
              onPress: () => this.setState({confirmDialog: false}),
            }
          );
        } else {
          place.icon = this.locationIcon;
          this._whorepme(place);
        }
      }, 500);
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

    this.setState({loading: false, myPosition: {icon: 'map-marker', address: say("location_access_denied"), error: true}, apiData: null});
    this.alert(say("current_location"), say("howto_use_current_location"));
  }

  render() {
    const {
      user, loading, apiData, myPosition, modalIsOpen,
      polProfile, polProfileOffice, polProfileInfo,
    } = this.state;

    switch(myPosition.icon) {
      case 'map-marker': basedOnYour = say("approximate_address"); break;
      case 'home': basedOnYour = say("home_address"); break;
      case 'map-signs': basedOnYour = say("searched_address"); break;
      default: basedOnYour = "..";
    }

    return (
      <Content>
        {myPosition.icon &&
          <TouchableOpacity onPress={() => {this.setState({modalIsOpen: true})}}>
              <Card>
                <CardItem header bordered>
                  <Icon style={{marginRight: 10}} name={myPosition.icon} size={20} color="black" />
                  <Text>{say("based_on_your")} {basedOnYour}. {say("tap_to_change")}</Text>
                </CardItem>
                <CardItem bordered>
                  <Body>
                  {myPosition.address &&
                  <Text style={{fontStyle: (myPosition.error?'italic':'normal')}}>{myPosition.address}</Text>
                  ||
                  <View style={{flexDirection: 'row'}}>
                    <Spinner />
                    <Text style={{fontStyle: 'italic'}}> {say("loading_address")}</Text>
                  </View>
                  }
                  </Body>
                </CardItem>
              </Card>
          </TouchableOpacity>
        }

        {loading &&
        <View style={{flex: 1}}>
          <View style={{flex: 1, margin: 10, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontSize: 18, textAlign: 'center', marginBottom: 10}}>{say("loading_district_information")}</Text>
            <Spinner />
          </View>
        </View>
        }

        {apiData && !loading && Object.keys(apiData.divisions).sort((a,b) => a.length>b.length).map(d => {
          // skip divisions with no offices
          if (!apiData.divisions[d].officeIndices) return null;
          // skip top level
          if (d === "ocd-division/country:us") return null;

          return (
            <View>
              {apiData.divisions[d].officeIndices.map(n => {
                // skip officies with no officials
                if (!apiData.offices[n].officialIndices) return null;
                return (
                  <View>
                    <Text style={{marginLeft: 10, fontSize: 20}}>{apiData.offices[n].name}</Text>
                    {apiData.offices[n].officialIndices.map(o => {
                      return (
                        <DisplayRep
                          refer={this}
                          office={apiData.offices[n].name}
                          info={apiData.officials[o]}
                          />
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        })}

        <Dialog
          title={say("show_representatives_by")+":"}
          visible={modalIsOpen}
          onTouchOutside={() => this.setState({modalIsOpen: false})}>
          <Button block bordered primary onPress={this.doCurrentLocation}>
            <Icon name="map-marker" size={25} color="black" />
            <Text>{say("current_location")}</Text>
          </Button>
          <Text>{'  '}</Text>
          <Button block bordered primary onPress={this._useHomeAddress}>
            <Icon name="home" size={25} color="black" />
            <Text>{say("home_address_cap")}</Text>
          </Button>
          <Text>{'  '}</Text>
          <Button block bordered primary onPress={this._useCustomAddress}>
            <Icon name="map-signs" size={20} color="black" />
            <Text>{say("searched_address_cap")}</Text>
          </Button>
        </Dialog>

        <Dialog
          visible={polProfile}
          onTouchOutside={() => this.setState({polProfile: false})}>
          <PolProfile office={polProfileOffice} profile={polProfileInfo} />
        </Dialog>

        <HVConfirmDialog refer={this} />

      </Content>
    );
  }
}
