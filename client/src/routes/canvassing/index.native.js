import React, { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default class Canvassing extends Component {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      myPosition: {latitude: -118.3281370, longitude: 33.9208231},
      region: {latitudeDelta: 0.004, longitudeDelta: 0.004},
    };
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    const { myPosition, region } = this.state;

    return (
      <View style={styles.map}>
            <Text>HELLO, WORLD!!</Text>

            <MapView
              ref={component => this.map = component}
              initialRegion={{latitude: myPosition.latitude, longitude: myPosition.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta}}
              style={styles.map}
              showsUserLocation={true}
              followsUserLocation={false}
              keyboardShouldPersistTaps={true}
              showsIndoors={false}
              showsTraffic={false}
              {...this.props}>
            </MapView>
      </View>
    );

  }

}

const styles = StyleSheet.create({
  icon: {
    justifyContent: 'center',
    borderRadius: 10,
    padding: 10,
  },
  iconContainer: {
    backgroundColor: '#ffffff', width: 65, height: 65, borderRadius: 65,
    borderWidth: 2, borderColor: '#000000',
    alignItems: 'center', justifyContent: 'center', margin: 2.5,
  },
  turfInfoContainer: {
    backgroundColor: '#ffffff', width: 125, height: 45,
    borderWidth: 2, borderColor: '#000000',
    alignItems: 'center', justifyContent: 'center', margin: 2.5,
  },
  map: {
    flex: 1,
    ...StyleSheet.absoluteFillObject,
  },
});
