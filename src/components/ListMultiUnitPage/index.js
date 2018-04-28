import React, { PureComponent } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
  TouchableHighlight,
  TouchableOpacity,
} from 'react-native';

import sha1 from 'sha1';
import Icon from 'react-native-vector-icons/FontAwesome';
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
      node: props.navigation.state.params.node,
      myNodes: props.navigation.state.params.refer.state.myNodes,
      form: props.navigation.state.params.refer.state.form,
      isKnockMenuVisible: false,
      newUnitModalVisible: false,
    };
  }

  addUnit = async () => {
    let { refer, form, node } = this.state;

    let json = this.refs.mainForm.getValue();
    if (json == null) return;

    let unit = {
      type: "unit",
      id: sha1(node.id+json.unit),
      parent_id: node.id,
      unit: json.unit,
    };

    // TODO: check for duplicates

    refer._addNode(unit);
    this.setState({newUnitModalVisible: false});
  }

  render() {
    const { refer } = this.state;

    let childNodes = refer.getChildNodesByIdType(this.state.node.id, "unit", this.state.myNodes).sort(refer.dynamicSort('unit'));

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}} contentContainerStyle={{flexGrow:1}}>
        <View>
          <Text style={{fontSize: 20, padding: 10}}>{this.state.node.address.join(", ")}</Text>

          <Icon.Button
            name="plus-circle"
            backgroundColor="#d7d7d7"
            color="#000000"
            onPress={() => {
              this.setState({ newUnitModalVisible: true });
            }}
            {...iconStyles}>
            Add new unit/apt number
          </Icon.Button>

          {childNodes.length === 0 &&
          <View>
            <View style={{margin: 10}} />
            <Icon.Button
              name="minus-circle"
              backgroundColor="#d7d7d7"
              color="#000000"
              onPress={() => {
                refer.updateNodeById(this.state.node.id, refer.state.myNodes, 'multi_unit', false);
                refer.forceUpdate();
                this.props.navigation.goBack();
              }}
              {...iconStyles}>
              Update to single-unit address
            </Icon.Button>
          </View>
          }

          <FlatList
            scrollEnabled={false}
            data={childNodes}
            keyExtractor={(item) => item.id}
            renderItem={({item}) => {
              let color = refer.getPinColor(item);
              let icon = (color === "red" ? "ban" : "address-book");

              let info = refer.getLatestSurvey(item.id);

              return (
                <View key={item.id} style={{padding: 10}}>
                  <TouchableOpacity
                    style={{flexDirection: 'row', alignItems: 'center'}}
                    onPress={() => {
                      this.setState({ isKnockMenuVisible: true, currentNode: item });
                    }}>
                    <Icon name={icon} size={40} color={color} style={{margin: 5}} />
                    <Text>Unit: {item.unit}, {JSON.stringify(info)}</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />

        </View>

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
          <KnockPage refer={this} funcs={refer} />
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
               type={mainForm}
              />
              <TouchableHighlight style={styles.button} onPress={this.addUnit} underlayColor='#99d9f4'>
                <Text style={styles.buttonText}>Add</Text>
              </TouchableHighlight>
            </View>
          </View>
        </Modal>

      </ScrollView>
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
