import React from 'react';
import { View, TouchableOpacity, FlatList } from 'react-native';
import { Button, Text } from 'native-base';

import HVComponent, { HVConfirmDialog } from '../../HVComponent';
import { NewUnitButton } from './SegmentResidence';

import Icon from 'react-native-vector-icons/FontAwesome';
import uuidv4 from 'uuid/v4';

import { say, getEpoch, getLastVisit, PersonAttr } from '../../common';

export default class App extends HVComponent {

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
    const { activePrev } = refer.state;
    const { navigate } = refer.props.navigation;

    const place = (unit?unit:marker);

    let LastInteraction = getLastVisit(place);

    return (
      <View>
        <Text>{(unit?'Unit '+unit.name:marker.address.street+', '+marker.address.city)}</Text>

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

/* TODO: Moved to become a button on the new knock dialog
  this.alert(
    'No longer lives here',
    'Are you sure you wish to mark this person as no longer lives here?',
    {
      title: say("yes"),
      onPress: () => {
        funcs.personMoved(marker.address.id, place, unit, item.id);
        item.moved = true;
        this.setState({confirmDialog: false, updated: getEpoch()}); // have to change state to have FlatList re-render
        refer.setState({updated: getEpoch()});
      },
    },
    {
      title: say("no"),
      onPress: () => this.setState({confirmDialog: false}),
    },
  );
*/

            return (
              <View key={item.id} style={{padding: 5}}>
                <TouchableOpacity
                  style={{flexDirection: 'row', alignItems: 'center'}}
                  onPress={() => {
                    navigate('Survey', {refer: this, funcs: funcs, form: form, marker: marker, unit: unit, person: item});
                  }}>
                  <Icon name={icon} color={color} size={40} style={{margin: 15}} />
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
        :
        <View style={{margin: 15, flexDirection: 'row'}}>
          <Text>No persons or units have been added to this address. Use the buttons below to add one.</Text>
        </View>
        }

        {funcs.add_new &&
        <View style={{margin: 15, flexDirection: 'row'}}>
          <Button block onPress={() => {
            if (!refer.addOk()) return refer.alert("Active Filter", "You cannot add a new person while a filter is active.");
            else navigate('Survey', {refer: this, funcs: funcs, form: form, marker: marker, unit: unit, person: {id: uuidv4(), new: true, attrs:[]}});
          }}>
            <Icon name="user-plus" backgroundColor="#d7d7d7" color="white" size={20} style={{marginLeft: 10}} />
            <Text>Add new Person</Text>
          </Button>
        </View>
        }

        <NewUnitButton refer={refer} place={marker} fromKnock={true} />

        <View style={{margin: 15, flexDirection: 'row'}}>
          <Button block warning onPress={() => {
            funcs.notHome(marker.address.id, place, unit);
            if (!unit) refer.setState({ active: activePrev, segmentList: 'streets' });
          }}>
            <Icon name="circle-o" backgroundColor="#d7d7d7" color="white" size={20} style={{marginLeft: 10}} />
            <Text>Not Home</Text>
          </Button>
        </View>

        <View style={{margin: 15, flexDirection: 'row'}}>
          <Button block danger onPress={() => {
            funcs.notInterested(marker.address.id, place, unit);
            if (!unit) refer.setState({ active: activePrev, segmentList: 'streets' });
          }}>
            <Icon name="ban" backgroundColor="#d7d7d7" color="white" size={20} style={{marginLeft: 10}} />
            <Text>Not Interested</Text>
          </Button>
        </View>

        <HVConfirmDialog refer={this} />

      </View>
    );
  }
}

const iconStyles = {
  justifyContent: 'center',
  borderRadius: 10,
  padding: 10,
};
