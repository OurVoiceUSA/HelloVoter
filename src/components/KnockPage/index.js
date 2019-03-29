
import React, { PureComponent } from 'react';

import {
  Alert,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import Swipeout from 'react-native-swipeout';

import { getEpoch } from '../../common';

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

            {place.people.length?
            <FlatList
              scrollEnabled={true}
              data={place.people}
              extraData={this.state}
              keyExtractor={item => item.id}
              renderItem={({item}) => {
                let icon = "user";
                let color = "black";
                if (item.moved) {
                  icon = "ban";
                  color = "red";
                }
                if (item.visit) {
                  icon = "check-circle";
                  color = "green";
                }
                return (
                  <View key={item.id} style={{padding: 5}}>
                    <Swipeout
                      style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
                      right={[{
                        text: 'Moved',
                        type: 'delete',
                        onPress: () => {
                          Alert.alert(
                            'No longer lives here',
                            'Are you sure you wish to mark this person as no longer lives here?',
                            [
                              {text: 'Yes', onPress: async () => {
                                funcs.personMoved(marker.address.id, place, unit, item.id);
                                item.moved = true;
                                this.setState({updated: getEpoch()}); // have to change state to have FlatList re-render
                                refer.setState({updated: getEpoch()});
                              }},
                              {text: 'No'},
                            ], { cancelable: false }
                          );
                        },
                      }]}
                      autoClose={true}>
                      <TouchableOpacity
                        style={{flexDirection: 'row', alignItems: 'center'}}
                        onPress={() => {
                          navigate('Survey', {refer: this, funcs: funcs, form: form, marker: marker, place: place, unit: unit, person: item});
                        }}>
                        <Icon name={icon} color={color} size={40} style={{margin: 5}} />
                        <View>
                          <PersonAttr form={form} idx={0} attrs={item.attrs} />
                          <PersonAttr form={form} idx={1} attrs={item.attrs} />
                          <PersonAttr form={form} idx={2} attrs={item.attrs} />
                        </View>
                      </TouchableOpacity>
                    </Swipeout>
                  </View>
                );
              }}
            />
            :
            <View><Text>There is nobody here!</Text></View>
            }

            <View style={{margin: 5, flexDirection: 'row'}}>
              <Icon.Button
                name="circle-o"
                backgroundColor="#d7d7d7"
                color="#000000"
                onPress={() => {
                  funcs.notHome(marker.address.id, place, unit);
                  refer.setState({ isKnockMenuVisible: false });
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
                  funcs.notInterested(marker.address.id, place, unit);
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
  if (props.form.attributes[props.idx]) {
    let id = props.form.attributes[props.idx].id;
    let name = props.form.attributes[props.idx].name;
    let attr = (props.attrs.filter(a => a.id === id))[0];
    if (attr) {
      let value = attr.value;
      if (props.form.attributes[props.idx].type === 'boolean') {
        if (value) value = "Yes";
        else value = "No";
      }
      return (
        <Text>
          {name}: {value}
        </Text>
      );
    }
  }
  return null;
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
