import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, Header, Body, ListItem, Item, Input, CheckBox } from 'native-base';
import Icon from 'react-native-vector-icons/FontAwesome';

import { PersonAttr } from '../../../lib/common';

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
  const { refer } = props;
  const { segmentList, people, onlyPhonePeople, peopleSearch, form, markers } = refer.state;

  if (segmentList!=='people') return null;

  if (!people.length) return (<Text style={{margin: 10}}>No people data for this area. Try widening your view on the map or adjusting your filter settings.</Text>);

  let ppl;

  if (peopleSearch) ppl = people.filter(p => pname(p.person).match(peopleSearch.toLowerCase()));
  else ppl = people;

  if (onlyPhonePeople) ppl = people.filter(p => pnumber(p.person));

  let arr = [(
    <View key="first">
      <View searchBar rounded style={{paddingTop: 0}}>
        <Item>
          <Icon name="search" size={20} />
          <Input placeholder="Search Person Name" onChangeText={text => refer.peopleSearch(text)} value={peopleSearch} />
        </Item>
      </View>
      <ListItem onPress={() => refer.setState({onlyPhonePeople: !onlyPhonePeople})}>
        <CheckBox checked={onlyPhonePeople} onPress={() => refer.setState({onlyPhonePeople: !onlyPhonePeople})} />
        <Body>
          <Text>Only show those with a Phone Number</Text>
        </Body>
      </ListItem>
      <Text>Showing {(ppl.length>=10?10:ppl.length)} of {ppl.length} in this area.</Text>
    </View>
  )];

  ppl.filter((p, i) => (i < 10)).map((p, idx) => arr.push((
    <View key={idx}>
      <View style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}>
                  <TouchableOpacity
                    style={{flexDirection: 'row', alignItems: 'center'}}
                    onPress={() => {
                      // find marker & unit by person
                      let marker = markers.find(m => m.address.id === p.address_id)
                      console.warn("Unable to navigate() to Survey screen");//navigate('Survey', {refer: refer, funcs: refer, form: form, marker: marker, unit: p.unit, person: p.person});
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
