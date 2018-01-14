import React, { PureComponent } from 'react';

import {
  Alert,
  ActivityIndicator,
  AsyncStorage,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  ScrollView,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  DeviceEventEmitter,
  Dimensions,
} from 'react-native';

import { NavigationActions } from 'react-navigation'
import Icon from 'react-native-vector-icons/FontAwesome';
import Permissions from 'react-native-permissions';
import RNGLocation from 'react-native-google-location';
import RNGooglePlaces from 'react-native-google-places';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      serviceError: null,
      locationAccess: null,
      myPosition: null,
      myAddress: null,
      geoAddress: null,
      inputPosition: null,
      inputAddress: null,
      cAddress : ["#","Name","City","State","Zip", "Apt #"],
      myPins: [],
      asyncStorageKey: 'OV_CANVASS_PINS@'+props.navigation.state.params.userId,
      DisclosureKey : 'OV_DISCLOUSER',
      isModalVisible: false,
      isKnockMenuVisible: false,
      userId: props.navigation.state.params.userId,
      showDisclosure: "true",
    };

  }

  doGeocode = async () => {
    let address = null;
    try {
      let res = await RNGooglePlaces.getCurrentPlace();
      if (res["0"]) {
        address = res["0"].address;
        this.setState({ myAddress: address });
      }
    } catch (error) {
      console.warn(error);
    }
    return address;
  }

  onLocationChange (e: Event) {
    let { myPosition } = this.state;
    myPosition = {
      latitude: e.Latitude,
      longitude: e.Longitude,
    };
    this.setState({ myPosition });
    var LL = {
      lat: e.Latitude,
      lng: e.Longitude,
    };

  }

  requestLocationPermission = async () => {
    
    access = false;

    try {
      res = await Permissions.request('location');
      if (res === "authorized") access = true;
    } catch(error) {
      // nothing we can do about it
    }

    if (access === true) {
      if (Platform.OS === 'android') {
        if (!this.evEmitter) {
          if (RNGLocation.available() === false) {
            this.setState({ serviceError: true });
          } else {
            this.evEmitter = DeviceEventEmitter.addListener('updateLocation', this.onLocationChange.bind(this));
            RNGLocation.reconnect();
            RNGLocation.getLocation();
          }
        }
      } else {
        this.getLocation();
        this.timerID = setInterval(() => this.getLocation(), 5000);
      }
    }

    this.setState({ locationAccess: access });
  }
  componentDidMount() {
    this.requestLocationPermission();
    this._getPinsAsyncStorage();
  this.LoadDisclosure(); //Updates showDisclosure state if the user previously accepted
  }

  getLocation() {
    navigator.geolocation.getCurrentPosition((position) => {

      this.setState({ myPosition: position.coords });

      var LL = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

    },
    (error) => { },
    { enableHighAccuracy: true, timeout: 2000, maximumAge: 1000 });
  }

  componentWillUnmount() {
    if (Platform.OS === 'ios') {
      clearInterval(this.timerID);
    } else {
      if (this.evEmitter) {
        RNGLocation.disconnect();
        this.evEmitter.remove();
      }
    }
  }

  doConfirmAddress = async () => {
    const { myAddress, cAddress } = this.state;
    var LL;
    var addr;
    var inputAddress = cAddress[0] + " " + cAddress[1] + " " + cAddress[2] + " " + cAddress[3] + " " + cAddress[4];

    // TODO: use RNGooglePlaces, but for now...
    // just use the original lat/lng
    LL = {
      latitude: myAddress.position.lat,
      longitude: myAddress.position.lng,
    };
    addr = await doGeocode();

    // res is an Array of geocoding object, take the first one
    this.setState({ inputPosition: LL, geoAddress: addr, inputAddress: addr.formattedAddress, isModalVisible: false });
    this.map.animateToCoordinate(LL, 500)
    // second modal doesn't show because of the map animation (a bug?) - have it set after it's done
    setTimeout(() => { this.setState({ isKnockMenuVisible: true }); }, 550);
  }

  addpin(color) {
    let { inputPosition, myPins, inputAddress, geoAddress, userId } = this.state;
    let epoch = Math.floor(new Date().getTime() / 1000);

    const pin = {
      latlng: {latitude: inputPosition.latitude, longitude: inputPosition.longitude},
      title: inputAddress,
      description: "Visited on "+new Date().toDateString(),
      color: color,
      epoch: epoch,
    };

    myPins.push(pin);

    this.setState({ myPins });

    this._savePinsAsyncStorage();

    const { navigate } = this.props.navigation;
    if (color === "green") navigate('Survey', {address: geoAddress, pinId: epoch, userId: userId});

  }

  SaveVariable(name, val)
  {
    this.setState(this.state.tempName : name);
    this.setState(this.state.tempValue : val);
    this.a_SaveVariable();
  }
  
  //Load a saved showDisclosure
  LoadDisclosure = async () => {
    try {
    //Load with DisclosureKey
      const value = await AsyncStorage.getItem(this.state.DisclosureKey);
      if (value !== null) {
      //Set state to variable if found
        this.setState({showDisclosure : value});
      }
    } catch (error) {    }
  }
  
  SaveDisclosure = async () => {
    try {
      //Save with DisclosureKey the value "false"
      await AsyncStorage.setItem(this.state.DisclosureKey, "false");
    } catch (error) {
      console.error(error);
    }
  }

  _getPinsAsyncStorage = async () => {
    try {
      const value = await AsyncStorage.getItem(this.state.asyncStorageKey);
      if (value !== null) {
        const pins = JSON.parse(value);
        this.setState({myPins: pins});
      }
    } catch (error) {
      console.error(error);
    }
  }

  _savePinsAsyncStorage = async () => {
    const pins = JSON.stringify(this.state.myPins);
    try {
      await AsyncStorage.setItem(this.state.asyncStorageKey, pins);
    } catch (error) {
      console.error(error);
    }
  }

  
  _canvassUrlHandler() {
    const url = "https://ourvoiceusa.org/ourvoice-canvassing-guidelines/";
    return Linking.openURL(url).catch(() => null);
  }

  render() {

    const { navigate } = this.props.navigation;
    const { showDisclosure, myPosition, cAddress, myPins, userId, locationAccess, serviceError } = this.state;

    if (showDisclosure === "true") {
      return (
        <ScrollView style={{flex: 1, backgroundColor: 'white'}}>
          <View style={styles.content}>
            <Text style={{margin: 15, fontSize: 18, color: 'dimgray'}}>
              Our Voice provides this canvassing tool for free for you to use for your own purposes. You will be talking
              to real people and asking real questions about policy positions that matter, and hopefully also collaborating
              with other canvassers. Together, we can crowd source the answers to how our country thinks outside of
              partisan politics.
            </Text>

            <View style={{margin: 15}}>
              <Text style={{fontSize: 18, color: 'dimgray'}}>
                By using this tool you acknowledge that you are acting on your own behalf, do not represent Our Voice Initiative
                or its affiliates, and have read our <Text style={{fontSize: 18, fontWeight: 'bold', color: 'blue'}} onPress={() => {this._canvassUrlHandler()}}>
                canvassing guidelines</Text>. Please be courteous to those you meet.
              </Text>
            </View>

                <View style={{margin: 5, flexDirection: 'row'}}>
                  <Icon.Button
                    name="check-circle"
                    backgroundColor="#d7d7d7"
                    color="#000000"
                    onPress={() => {
                      this.setState({ showDisclosure: "false"}); //Hide disclosure
                      this.SaveDisclosure(); //Save the disclosures acceptance
                    }}
                    {...iconStyles}>
                    I understand & agree to the guidelines
                  </Icon.Button>
                </View>

                <View style={{margin: 5, flexDirection: 'row'}}>
                  <Icon.Button
                    name="ban"
                    backgroundColor="#d7d7d7"
                    color="#000000"
                    onPress={() => {this.props.navigation.dispatch(NavigationActions.back())}}
                    {...iconStyles}>
                    I do not agree to this! Take me back!
                  </Icon.Button>
                </View>

          </View>
        </ScrollView>
      );
    }

    if (locationAccess === false) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text>Access to your location is disabled.</Text>
            <Text>The canvassing tool requires it to be enabled.</Text>
          </View>
        </View>
      );
    }

    if (Platform.OS === 'android' && Platform.Version < 22) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text>Android version 5.1 or greater is required to run the canvassing app.</Text>
          </View>
        </View>
      );
    }

    if (serviceError === true) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text>Unable to load location services from your device.</Text>
          </View>
        </View>
      );
    }

    if (!myPosition) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text>Waiting on location data from your device...</Text>
            <ActivityIndicator />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>

        <MapView
          ref={component => this.map = component}
          initialRegion={{latitude: myPosition.latitude, longitude: myPosition.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005}}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          showsUserLocation={true}
          followsUserLocation={false}
          keyboardShouldPersistTaps={true}
          {...this.props}>
          {
            myPins.map((marker, index) => (
              <MapView.Marker
                key={index}
                coordinate={marker.latlng}
                title={marker.title}
                description={marker.description}
                pinColor={marker.color}
                onCalloutPress={() => {
                  if (marker.color == "green")
                    navigate('Survey', {pinId: marker.epoch, userId: userId, viewOnly: true})
                }}
                />
            ))
          }
        </MapView>
          <View style={{ alignSelf: 'flex-end' }}>
            <Icon name="compass" size={50} color="#0084b4" onPress={() => this.map.animateToCoordinate({latitude: myPosition.latitude, longitude: myPosition.longitude}, 1000)} />
          </View>
        <View style={styles.buttonContainer}>
          <Icon.Button
            name="hand-rock-o"
            backgroundColor="#d7d7d7"
            color="#000000"
            onPress={() => {Alert.alert('Error', 'I apologize! This feature is currently broken. Will be fixed soon.', [{text: 'OK'}], { cancelable: false })}}
            {...iconStyles}>
            Prepare to Knock
          </Icon.Button>
        </View>
      </View>
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  latlng: {
    width: 200,
    alignItems: 'stretch',
  },
  button: {
    width: 300,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    backgroundColor: '#d7d7d7',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: 'transparent',
  },
  buttonText: {
    textAlign: 'center',
  },
});
