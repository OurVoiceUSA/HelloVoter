
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
import uuidv4 from 'uuid/v4';

import { getEpoch, PersonAttr } from '../../common';

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
      <View>
        <Text>{(unit?'Unit '+unit.name:marker.address.street+', '+marker.address.city)}</Text>

        {funcs.add_new &&
        <View style={{margin: 5, flexDirection: 'row'}}>
          <Icon.Button
            name="user-plus"
            backgroundColor="#d7d7d7"
            color="#000000"
            onPress={() => {
              navigate('Survey', {refer: this, funcs: funcs, form: form, marker: marker, unit: unit, person: {id: uuidv4(), new: true, attrs:[]}});
            }}
            {...iconStyles}>
            Add Person
          </Icon.Button>
        </View>
        }

        {place.people.length?
        <FlatList
          scrollEnabled={false}
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
                      navigate('Survey', {refer: this, funcs: funcs, form: form, marker: marker, unit: unit, person: item});
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
        <View style={{margin: 5, flexDirection: 'row'}}>
          {(!unit && funcs.add_new) &&
          <Icon.Button
            name="plus-circle"
            backgroundColor="#d7d7d7"
            color="#000000"
            onPress={() => {
              refer.setState({ isKnockMenuVisible: false });
              navigate('ListMultiUnit', {refer: refer, form: form, addUnit: true});
            }}
            {...iconStyles}>
            Add Unit/Apt
          </Icon.Button>
          }
        </View>
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
