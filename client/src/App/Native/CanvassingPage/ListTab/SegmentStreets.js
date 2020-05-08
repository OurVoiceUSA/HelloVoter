import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Accordion, Header, Content, Text } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';

import { say, getPinColor, getLastVisit, Divider } from '../../common';

export default SegmentStreets = props => {
  const { refer } = props;
  const { segmentList, listview, listview_order, selectedStreet } = refer.state;
  if (segmentList!=='streets') return null;

  if (!listview_order.length) return (<Text style={{margin: 10}}>No address data for this area. Try widening your view on the map or adjusting your filter settings.</Text>);

  return (
    <Accordion
      dataArray={listview_order}
      onAccordionOpen={(s, idx) => refer.setState({selectedStreet: idx})}
      onAccordionClose={(s, idx) => refer.setState({selectedStreet: null})}
      expanded={selectedStreet}
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
            <Text style={{alignSelf: 'center', margin: 20, marginLeft: 10}}>{street} ({listview[street].length})</Text>
          </View>
          <Divider />
        </View>
      )}
      renderContent={(street) => {
        return listview[street].map((marker, idx) => {
          let color = getPinColor(marker);
          let icon = (color === "red" ? "ban" : "home");
          let num_people = marker.people.length;
          marker.units.forEach((u) => num_people+=u.people.length);

          return (
            <View key={idx} style={{padding: 10, paddingTop: 0}}>
              <TouchableOpacity
                style={{flexDirection: 'row', alignItems: 'center'}}
                onPress={() => refer.doMarkerPress(marker)}>
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
