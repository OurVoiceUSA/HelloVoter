
import React, { PureComponent } from 'react';

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';

export default class App extends PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      refer: this.props.refer,
      funcs: this.props.funcs,
    };
  }

  render() {
    const { refer, funcs } = this.state;
    const { navigate } = refer.props.navigation;

    let LastInteraction = funcs.getLastInteraction(refer.state.currentNode.id);
    let info = funcs.getLatestSurveyInfo(refer.state.currentNode.id);

    let name = "N/A";
    let party = "N/A";

    // find me a key that has "name" and "party" in it
    let keys = Object.keys(funcs.state.form.questions);
    for (let k in keys) {
      let key = keys[k];
      if (info && info[key]) {
        if (key.match(/name/i))
          name = info[key];
        if (key.match(/party/i))
          party = info[key];
      }
    }

    return (
      <View style={{flexDirection: 'column'}}>
        <View style={{width: 280, height: 350, backgroundColor: 'white', marginTop: 15, borderRadius: 15, padding: 25, alignSelf: 'flex-start'}}>
          <View>
            <Text>Name: {name}</Text>
            <Text>Party: {party}</Text>
            <Text>{LastInteraction}</Text>

            <View style={{margin: 5, flexDirection: 'row'}}>
              <Icon.Button
                name="check-circle"
                backgroundColor="#d7d7d7"
                color="#000000"
                onPress={() => {
                  refer.setState({ isKnockMenuVisible: false });
                  navigate('Survey', {refer: refer, funcs: funcs, info: info});
                }}
                {...iconStyles}>
                Take Survey
              </Icon.Button>
            </View>

            <View style={{margin: 5, flexDirection: 'row'}}>
              <Icon.Button
                name="circle-o"
                backgroundColor="#d7d7d7"
                color="#000000"
                onPress={() => {
                  funcs._addNode({
                    type: "survey",
                    parent_id: refer.state.currentNode.id,
                    status: 'not home',
                  });
                  refer.setState({ isKnockMenuVisible: false })
                  funcs.updateMarkers();
                }}
                {...iconStyles}>
                Not Home
              </Icon.Button>
            </View>

            <View style={{margin: 5, flexDirection: 'row'}}>
              <Icon.Button
                name="ban"
                backgroundColor="#d7d7d7"
                color="#000000"
                onPress={() => {
                  funcs._addNode({
                    type: "survey",
                    parent_id: refer.state.currentNode.id,
                    status: 'not interested',
                  });
                  refer.setState({ isKnockMenuVisible: false });
                  funcs.updateMarkers();
                }}
                {...iconStyles}>
                Not Interested
              </Icon.Button>
            </View>

            {refer.state.currentNode.type === "address" && !funcs.nodeHasSurvey(refer.state.currentNode) &&
            <View style={{margin: 5, marginTop: 50, flexDirection: 'row'}}>
              <Icon.Button
                name="building"
                backgroundColor="#d7d7d7"
                color="#000000"
                onPress={() => {
                  refer.setState({ isKnockMenuVisible: false });
                  funcs.updateNodeById(refer.state.currentNode.id, 'multi_unit', true);
                  funcs.doMarkerPress(refer.state.currentNode);
                }}
                {...iconStyles}>
                Update to multi-unit
              </Icon.Button>
            </View>
            }

          </View>

        </View>
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
  header: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
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
