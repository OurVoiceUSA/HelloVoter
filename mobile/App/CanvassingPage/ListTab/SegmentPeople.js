import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';

import { say, PersonAttr } from '../../common';

function pname(person) {
  let name = "";
  if (person.attrs) {
    person.attrs.forEach(a => {
      if (a.id === "013a31db-fe24-4fad-ab6a-dd9d831e72f9") name = a.value;
    });
  }
  return name.toLowerCase();
}

function pnumber(person) {
  let havePhone = false;
  if (person.attrs) {
    person.attrs.forEach(a => {
      if (a.id === "7d3466e5-2cee-491e-b3f4-bfea3a4b010a" && a.value) havePhone = true;
    });
  }
  return havePhone;
}

export default SegmentPeople = props => {
  const { navigate } = props.refer.props.navigation;
  let rstate = props.refer.state;

  if (rstate.segmentList!=='people') return null;

  if (!rstate.people.length) return (<Text style={{margin: 10}}>No people data for this area. Try widening your view on the map or adjusting your filter settings.</Text>);

  let form = rstate.form;
  let people;

  if (rstate.peopleSearch) people = rstate.people.filter(p => pname(p.person).match(rstate.peopleSearch.toLowerCase()));
  else people = rstate.people;

  if (rstate.onlyPhonePeople) people = people.filter(p => pnumber(p.person));

  let arr = [(
    <View key="first">
      <Text>Showing {(people.length>=10?10:people.length)} of {people.length} in this area.</Text>
    </View>
  )];

  people.filter((p, i) => (i < 10)).map((p, idx) => arr.push((
    <View key={idx}>
      <View style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}>
                  <TouchableOpacity
                    style={{flexDirection: 'row', alignItems: 'center'}}
                    onPress={() => {
                      // find marker & unit by person
                      let marker = rstate.markers.find(m => m.address.id === p.address_id)
                      navigate('Survey', {refer: props.refer, funcs: props.refer, form: form, marker: marker, unit: p.unit, person: p.person});
                    }}>
                    <Icon name="user" color="black" size={40} style={{margin: 5}} />
                    <View>
                      <PersonAttr form={form} idx={0} attrs={p.person.attrs} />
                      <PersonAttr form={form} idx={1} attrs={p.person.attrs} />
                      <PersonAttr form={form} idx={2} attrs={p.person.attrs} />
                    </View>
                  </TouchableOpacity>
      </View>
      <Text>{' '}</Text>
    </View>
  )));

  return arr;
};
