import React from 'react';

import {
  View,
  TouchableOpacity,
} from 'react-native';

import {
  Accordion, Header, Body, Content, Text, Button, Spinner, Segment,
  CheckBox, Item, Input, Left, Right, List, ListItem, Thumbnail,
} from 'native-base';
import Icon from 'react-native-vector-icons/FontAwesome';

import Knock from './Knock';
import { say, Divider, PersonAttr } from '../../common';

function statusToText(code) {
  switch (code) {
    case 0: return 'Not Home';
    case 1: return 'Home';
    case 2: return 'Not Interested';
    case 3: return 'Moved';
    default: return 'unknown';
  }
}

export default ListTab = props => {
  const { onlyPhonePeople, segmentList } = props.refer.state;

  return (
    <View>
      <Header hasSegment style={{paddingTop: 0}}>
        <Segment>
          <Button first active={(segmentList==='streets')} onPress={() => props.refer.setState({segmentList: 'streets'})}><Text>Streets</Text></Button>
          <Button active={(segmentList==='residence')} onPress={() => props.refer.setState({segmentList: 'residence'})}><Text>Residence</Text></Button>
          <Button active={(segmentList==='people')} onPress={() => props.refer.setState({segmentList: 'people'})}><Text>People</Text></Button>
          <Button last active={(segmentList==='history')} onPress={() => props.refer.setState({segmentList: 'history'})}><Text>History</Text></Button>
        </Segment>
      </Header>
      {segmentList==='people'&&
      <View>
        <Header searchBar rounded>
          <Item>
            <Icon name="search" />
            <Input placeholder="Search" onChangeText={text => props.refer.peopleSearchDebounce(text)} />
            <Icon name="group" />
          </Item>
        </Header>
        <ListItem onPress={() => props.refer.setState({onlyPhonePeople: !onlyPhonePeople})}>
          <CheckBox checked={onlyPhonePeople} onPress={() => props.refer.setState({onlyPhonePeople: !onlyPhonePeople})} />
          <Body>
            <Text>{say("Only show those with a Phone Number")}</Text>
          </Body>
        </ListItem>
      </View>
      }
      <SegmentStreets refer={props.refer} />
      <SegmentResidence refer={props.refer} />
      <SegmentPeople refer={props.refer} />
      <SegmentHistory refer={props.refer} />
    </View>
  );
}

const SegmentStreets = props => {
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
          let color = props.refer.getPinColor(marker);
          let icon = (color === "red" ? "ban" : "home");
          let num_people = marker.people.length;
          marker.units.forEach((u) => num_people+=u.people.length);

          return (
            <View key={idx} style={{padding: 10, paddingTop: 0}}>
              <TouchableOpacity
                style={{flexDirection: 'row', alignItems: 'center'}}
                onPress={() => props.refer.doMarkerPress(marker)}>
                <Icon name={icon} size={40} color={color} style={{margin: 5}} />
                <Text>{marker.address.street} - {props.refer.getLastVisit(marker)} ({num_people})</Text>
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

const SegmentResidence = props => {
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
          color={props.refer.getPinColor(rstate.currentMarker)} />
        }

        <Accordion dataArray={rstate.currentMarker.units}
          renderHeader={(u) => (
            <Unit unit={u}
              refer={props.refer}
              color={props.refer.getPinColor(u)} />
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

const SegmentPeople = props => {
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

function dateFormat(epoch) {
  return new Date(epoch).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
}

function timeFormat(epoch) {
  return new Date(epoch).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

const SegmentHistory = props => {
  let rstate = props.refer.state;
  if (rstate.segmentList!=='history') return null;
  let lastday;

  return (
    <Content>
      {rstate.fetchingHistory&&
      <Spinner />
      }
      {!rstate.fetchingHistory&&
      <View style={{padding: 10}}>
        <Text>{(rstate.history.length?'Loaded '+rstate.history.length+' historical actions:':'No history to view')}</Text>
      </View>
      }
      <List>
        {rstate.history.map((item, idx) => {
          let showtoday = false;
          let today = dateFormat(item.datetime);
          if (lastday !== today) {
            lastday = today;
            showtoday = true;
          }
          return (
            <View key={idx}>
              {showtoday &&
              <ListItem itemDivider>
                <Text>{today}</Text>
              </ListItem>
              }
              <ListItem avatar onPress={() => props.refer.animateToCoordinate({longitude: item.address.position.x, latitude: item.address.position.y}, 1000)}>
                <Left>
                  <Thumbnail source={{ uri: item.volunteer.avatar }} />
                </Left>
                <Body>
                  <Text>{item.address.street}</Text>
                  <Text>{statusToText(item.status)}</Text>
                  <Text>{(item.person?item.person.name:'')}</Text>
                </Body>
                <Right>
                  <Text note>{timeFormat(item.datetime)}</Text>
                </Right>
              </ListItem>
            </View>
          );
        })}
      </List>
    </Content>
  );
};

const Unit = props => (
  <View key={props.unit.name} style={{padding: 10}}>
    <View
      style={{flexDirection: 'row', alignItems: 'center'}}>
      <Icon name={(props.color === "red" ? "ban" : "address-book")} size={40} color={props.color} style={{margin: 5}} />
      <Text>Unit {(props.unknown?"Unknown":props.unit.name)} - {props.refer.getLastVisit(props.unit)}</Text>
    </View>
  </View>
);
