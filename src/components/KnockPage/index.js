
import React, { PureComponent } from 'react';

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';

export default class App extends PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      refer: this.props.refer,
      marker: this.props.marker,
      unit: this.props.unit,
    };
  }

  render() {
    const { refer, marker, unit } = this.state;
    const { navigate } = refer.props.navigation;

    const place = (unit?unit:marker);

    let LastInteraction = refer.getLastVisit(place);

    return (
      <View style={{flexDirection: 'column'}}>
        <View style={{width: 280, height: 350, backgroundColor: 'white', marginTop: 15, borderRadius: 15, padding: 25, alignSelf: 'flex-start'}}>
          <View>
            <Text>{marker.address.street}, {marker.address.city}</Text>
            <Text>People: {JSON.stringify(place.people)}</Text>

            <View style={{margin: 5, flexDirection: 'row'}}>
              <Icon.Button
                name="circle-o"
                backgroundColor="#d7d7d7"
                color="#000000"
                onPress={() => {
                  // TODO: refer.dataAdd()
                  refer.setState({ isKnockMenuVisible: false })
                }}
                {...iconStyles}>
                Not Home
              </Icon.Button>
            </View>

            <View style={{margin: 5, flexDirection: 'row'}}>
              <Icon.Button
                name="ban"
                backgroundColor="#d7d7d7"
                color="#000000"
                onPress={() => {
                  // TODO: refer.dataAdd()
                  refer.setState({ isKnockMenuVisible: false });
                }}
                {...iconStyles}>
                Not Interested
              </Icon.Button>
            </View>

          </View>

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
  header: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
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
