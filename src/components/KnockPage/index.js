
import React, { PureComponent } from 'react';

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';

export default class App extends PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      refer: this.props.refer,
      funcs: this.props.funcs,
      form: this.props.form,
      marker: this.props.marker,
      unit: this.props.unit,
    };
  }

  render() {
    const { refer, funcs, marker, unit, form } = this.state;
    const { navigate } = refer.props.navigation;

    const place = (unit?unit:marker);

    let LastInteraction = funcs.getLastVisit(place);

    return (
      <View style={{flexDirection: 'column'}}>
        <View style={{width: 300, height: 450, backgroundColor: 'white', marginTop: 15, borderRadius: 15, padding: 10, alignSelf: 'flex-start'}}>
          <View>
            <Text>{(unit?'Unit '+unit.name:marker.address.street+', '+marker.address.city)}</Text>

            <FlatList
              scrollEnabled={true}
              data={place.people}
              keyExtractor={item => item.id}
              renderItem={({item}) => {
                return (
                  <View key={item.id} style={{padding: 5}}>
                    <TouchableOpacity
                      style={{flexDirection: 'row', alignItems: 'center'}}
                      onPress={() => {
                        refer.setState({ isKnockMenuVisible: false });
                        navigate('Survey', {refer: refer, funcs: funcs, form: form, address: marker.address, unit: unit, person: item});
                      }}>
                      <Icon name="user" size={40} style={{margin: 5}} />
                      <View>
                        <PersonAttr form={form} idx={0} attrs={item.attrs} />
                        <PersonAttr form={form} idx={1} attrs={item.attrs} />
                        <PersonAttr form={form} idx={2} attrs={item.attrs} />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />

            <View style={{margin: 5, flexDirection: 'row'}}>
              <Icon.Button
                name="circle-o"
                backgroundColor="#d7d7d7"
                color="#000000"
                onPress={() => {
                  funcs.notHome(marker.address, unit);
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
                  funcs.notInterested(marker.address, unit);
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

const PersonAttr = props => {
  let id = props.form.attributes_order[props.idx];
  let attr = (props.attrs.filter(a => a.id === id))[0];
  if (attr) {
    return (
      <Text>
        {attr.name}: {attr.value}
      </Text>
    );
  } else {
    return null;
  }
};

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
