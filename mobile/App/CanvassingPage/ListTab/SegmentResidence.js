import React from 'react';
import { View } from 'react-native';
import { Accordion, Content, Text, Button } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';

import Knock from './Knock';
import { say, getPinColor, getLastVisit } from '../../common';

export default SegmentResidence = props => {
  let rstate = props.refer.state;
  if (rstate.segmentList!=='residence') return null;

  if (!rstate.currentMarker) return (<Text>No residence is selected.</Text>);

  if (rstate.currentMarker.units && rstate.currentMarker.units.length) {
    return (
      <Content padder>
        <Text style={{fontSize: 20, padding: 10}}>{rstate.currentMarker.address.street}, {rstate.currentMarker.address.city}</Text>

        {props.refer.add_new &&
        <Button block onPress={() => {
            if (!props.refer.addOk()) return props.refer.alert("Active Filter", "You cannot add a new address while a filter is active.");
            props.refer.setState({ newUnitDialog: true });
          }}>
          <Icon name="plus-circle" backgroundColor="#d7d7d7" color="white" size={20} />
          <Text>Add new unit/apt number</Text>
        </Button>
        }

        {(rstate.currentMarker.people && rstate.currentMarker.people.length !== 0) &&
        <Unit unit={rstate.currentMarker}
          unknown={true}
          refer={props.refer}
          color={getPinColor(rstate.currentMarker)} />
        }

        <Accordion dataArray={rstate.currentMarker.units}
          renderHeader={(u) => (
            <Unit unit={u}
              refer={props.refer}
              color={getPinColor(u)} />
          )}
          renderContent={(u) => (
            <Knock refer={props.refer} funcs={props.refer} marker={rstate.currentMarker} unit={u} form={rstate.form} />
          )}
        />
    </Content>
    );
  }

  return (
    <Knock refer={props.refer} funcs={props.refer} marker={rstate.currentMarker} form={rstate.form} />
  );
}

const Unit = props => (
  <View key={props.unit.name} style={{padding: 10}}>
    <View
      style={{flexDirection: 'row', alignItems: 'center'}}>
      <Icon name={(props.color === "red" ? "ban" : "address-book")} size={40} color={props.color} style={{margin: 5}} />
      <Text>Unit {(props.unknown?"Unknown":props.unit.name)} - {getLastVisit(props.unit)}</Text>
    </View>
  </View>
);
