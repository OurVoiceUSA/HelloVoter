import React from 'react';
import { View } from 'react-native';
import { Accordion, Content, Text, Button } from 'native-base';

import { NewUnitDialog } from '../FormDialogs';
import Knock from './Knock';

import Icon from 'react-native-vector-icons/FontAwesome';

import { say, getPinColor, getLastVisit, sortAlphaNum } from '../../common';

export default SegmentResidence = props => {
  const { refer } = props;
  const { segmentList, currentMarker, form } = refer.state;

  if (segmentList!=='residence') return null;

  if (!currentMarker) return (<Text>No residence is selected.</Text>);

  if (currentMarker.units && currentMarker.units.length) {
    return (
      <Content padder>
        <Text style={{fontSize: 20, padding: 10}}>{currentMarker.address.street}, {currentMarker.address.city}</Text>

        <NewUnitButton refer={refer} place={currentMarker} />

        {(currentMarker.people && currentMarker.people.length !== 0) &&
        <Unit unit={currentMarker}
          unknown={true}
          refer={refer}
          color={getPinColor(currentMarker)} />
        }

        <Accordion dataArray={currentMarker.units.sort(sortAlphaNum)}
          renderHeader={(u) => (
            <Unit unit={u}
              refer={refer}
              color={getPinColor(u)} />
          )}
          renderContent={(u) => (
            <Knock refer={refer} funcs={refer} marker={currentMarker} unit={u} form={form} />
          )}
        />
        <NewUnitDialog refer={refer} />
    </Content>
    );
  }

  return (
    <View>
      <Knock refer={refer} funcs={refer} marker={currentMarker} form={form} />
      <NewUnitDialog refer={refer} />
    </View>
  );
}

export const NewUnitButton = props => {
  const { refer, place, fromKnock } = props;
  if (!refer.add_new || (place.people && place.people.length) || (fromKnock && place.units && place.units.length)) return null;
  return (
    <View style={{margin: 15, flexDirection: 'row'}}>
      <Button block onPress={() => {
          if (!refer.addOk()) return refer.alert("Active Filter", "You cannot add a new address while a filter is active.");
          refer.setState({ newUnitDialog: true });
        }}>
        <Icon name="plus-circle" backgroundColor="#d7d7d7" color="white" size={20} style={{marginLeft: 10}} />
        <Text>Add new unit/apt number</Text>
      </Button>
    </View>
  );
};

const Unit = props => (
  <View key={props.unit.name} style={{padding: 10}}>
    <View
      style={{flexDirection: 'row', alignItems: 'center'}}>
      <Icon name={(props.color === "red" ? "ban" : "address-book")} size={40} color={props.color} style={{margin: 5}} />
      <Text>Unit {(props.unknown?"Unknown":props.unit.name)} - {getLastVisit(props.unit)}</Text>
    </View>
  </View>
);
