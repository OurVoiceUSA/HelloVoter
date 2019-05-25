import React, { PureComponent } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableHighlight,
  TouchableOpacity,
} from 'react-native';

import { BottomNavigation } from 'react-native-material-ui';

import { orderBy } from 'natural-orderby';
import Icon from 'react-native-vector-icons/FontAwesome';
import DeviceInfo from 'react-native-device-info';
import Modal from 'react-native-simple-modal';
import KnockPage from '../KnockPage';

import t from 'tcomb-form-native';

var Form = t.form.Form;

var mainForm = t.struct({
  'unit': t.String,
});

export default class App extends PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      refer: props.navigation.state.params.refer,
      form: props.navigation.state.params.form,
      isKnockMenuVisible: false,
      newUnitModalVisible: (props.navigation.state.params.addUnit?true:false),
    };
  }

  addUnit = async () => {
    let { refer, form } = this.state;
    let { myPosition } = refer.state;

    let json = this.refs.mainForm.getValue();
    if (json == null) return;

    // search for dupes
    let dupe = false;
    refer.currentMarker.units.forEach(u => {
      if (u.name.toLowerCase() === json.unit.toLowerCase()) dupe = true;
    });

    if (!dupe) {
      let input = {
        deviceId: DeviceInfo.getUniqueID(),
        formId: form.id,
        timestamp: refer.getEpoch(),
        longitude: myPosition.longitude,
        latitude: myPosition.latitude,
        unit: json.unit,
        addressId: refer.currentMarker.address.id,
      };

      refer.sendData('/address/add/unit', input);
      refer.currentMarker.units.push({name: json.unit, people: []});
    }

    this.setState({newUnitModalVisible: false});
  }

  render() {
    const { refer, form } = this.state;

    const marker = refer.getCurrentMarker();

    return (
      <View style={{flex: 1}}>
        <ScrollView style={{flex: 1, backgroundColor: 'white'}} contentContainerStyle={{flexGrow:1}}>
          <Text style={{fontSize: 20, padding: 10}}>{marker.address.street}, {marker.address.city}</Text>

          {refer.add_new &&
          <Icon.Button
            name="plus-circle"
            backgroundColor="#d7d7d7"
            color="#000000"
            onPress={() => {
              if (!refer.addOk()) {
                Alert.alert('Active Filter', 'You cannot add a new address while a filter is active.', [{text: 'OK'}], { cancelable: false });
                return;
              }
              this.setState({ newUnitModalVisible: true });
            }}
            {...iconStyles}>  
            Add new unit/apt number
          </Icon.Button>
          }

          <FlatList
            scrollEnabled={false}
            data={orderBy(marker.units, u => u.name)}
            extraData={this.state}
            keyExtractor={item => item.name}
            renderItem={({item}) => {
              let color = refer.getPinColor(item);
              let icon = (color === "red" ? "ban" : "address-book");

              return (
                <View key={item.name} style={{padding: 10}}>
                  <TouchableOpacity
                    style={{flexDirection: 'row', alignItems: 'center'}}
                    onPress={() => {
                      this.setState({ isKnockMenuVisible: true, marker: marker, currentUnit: item });
                    }}>
                    <Icon name={icon} size={40} color={color} style={{margin: 5}} />
                    <Text>Unit {item.name} - {refer.getLastVisit(item)}</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />

        </ScrollView>

        <Modal
          open={this.state.isKnockMenuVisible}
          modalStyle={{width: 335, height: 280, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40}
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({isKnockMenuVisible: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <KnockPage refer={this} funcs={refer} marker={marker} unit={this.state.currentUnit} form={form} />
        </Modal>

        <Modal 
          open={this.state.newUnitModalVisible}
          modalStyle={{width: 335, height: 250, backgroundColor: "transparent",
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          style={{alignItems: 'center'}}
          offset={0}
          overlayBackground={'rgba(0, 0, 0, 0.75)'}
          animationDuration={200}
          animationTension={40} 
          modalDidOpen={() => undefined}
          modalDidClose={() => this.setState({newUnitModalVisible: false})}
          closeOnTouchOutside={true}
          disableOnBackPress={false}>
          <View style={styles.container}>
            <View>
              <View style={{flex: 1, flexDirection: 'row', margin: 20, alignItems: 'center'}}>
                <Text>Recording a new unit for this address:</Text>
              </View>

              <Form
                ref="mainForm"
                options={{fields: {unit: {autoFocus: true}}}}
                type={mainForm}
              />
              <TouchableHighlight style={styles.button} onPress={this.addUnit} underlayColor='#99d9f4'>
                <Text style={styles.buttonText}>Add</Text>
              </TouchableHighlight>
            </View>
          </View>
        </Modal>

        <BottomNavigation active={'done'} hidden={false} >
          <BottomNavigation.Action
            key="done"
            icon="undo"
            label="Go Back"
            onPress={() => this.props.navigation.goBack()}
          />
        </BottomNavigation>

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
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  buttonText: {
    fontSize: 18,
    color: 'white',
    alignSelf: 'center'
  },
  button: {
    height: 36,
    backgroundColor: '#48BBEC',
    borderColor: '#48BBEC',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'stretch',
    justifyContent: 'center'
  },
  content: {
    flex: 1,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    margin: 20,
  },
  avatarImage: {
    borderRadius: 50,
    height: 100,
    width: 100,
  },
  centerscreen: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  header: {
    fontSize: 22,
    marginBottom: 10,
    marginLeft: 10,
    fontWeight: 'bold',
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
