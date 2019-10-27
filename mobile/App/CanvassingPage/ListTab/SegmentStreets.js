import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Accordion, Header, Content, Text } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';

import { say, getPinColor, getLastVisit, Divider } from '../../common';

export default SegmentStreets = props => {
  let rstate = props.refer.state;
  if (rstate.segmentList!=='streets') return null;

  if (!rstate.listview_order.length) return (<Text style={{margin: 10}}>No address data for this area. Try widening your view on the map or adjusting your filter settings.</Text>);

  return (
    <Accordion
      dataArray={rstate.listview_order}
      onAccordionOpen={(s, idx) => props.refer.setState({selectedStreet: idx})}
      onAccordionClose={(s, idx) => props.refer.setState({selectedStreet: null})}
      expanded={rstate.selectedStreet}
      renderHeader={(street, ex) => (
        <View>
          <View style={{flex: 1, flexDirection: 'row'}}>
            <Icon
              style={{margin: 20, marginRight: 10}}
              size={20}
              name={(ex?"minus-circle":"plus-circle")}
              backgroundColor="#d7d7d7"
              color="black"
            />
            <Text style={{alignSelf: 'center', margin: 20, marginLeft: 10}}>{street} ({rstate.listview[street].length})</Text>
          </View>
          <Divider />
        </View>
      )}
      renderContent={(street) => {
        return rstate.listview[street].map((marker, idx) => {
          let color = getPinColor(marker);
          let icon = (color === "red" ? "ban" : "home");
          let num_people = marker.people.length;
          marker.units.forEach((u) => num_people+=u.people.length);

          return (
            <View key={idx} style={{padding: 10, paddingTop: 0}}>
              <TouchableOpacity
                style={{flexDirection: 'row', alignItems: 'center'}}
                onPress={() => props.refer.doMarkerPress(marker)}>
                <Icon name={icon} size={40} color={color} style={{margin: 5}} />
                <Text>{marker.address.street} - {getLastVisit(marker)} ({num_people})</Text>
                </TouchableOpacity>
                <Divider />
              </View>
            );
          }
        )

      }}
    />
  );
};
