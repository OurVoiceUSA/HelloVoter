import React, { PureComponent } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';

import {
  Dimensions,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { setField, saveLocalFields } from '../../util/fields';

export default class ModalInput extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      inputValue: props.inputValue,
    };
  }

  render() {
    let parties = ['Democrat', 'Republican', 'Green', 'Libertarian', 'Unaffiliated'];
    parties = parties.map((item, index) => {
      return (
        <TouchableOpacity
          onPress={() => {
            this.props.refer.setState({isModalVisible: false});
            setField(this.props.refer, this.props.refer.state.selectedField, item);
          }}
          style={{paddingVertical: 5}}
          key={index}
        >
          <Text>{item}</Text>
        </TouchableOpacity>
      );
    });

    let surveyItems = [
      {value: '2', description: 'Strongly Agree'},
      {value: '1', description: 'Agree'},
      {value: '0', description: 'Neutral'},
      {value: '-1', description: 'Disagree'},
      {value: '-2', description: 'Strongly Disagree'},
    ];
    surveyItems = surveyItems.map((item, index) => {

      thisSize = 20;

      switch (item.value) {
      case "2":
        thisIcon = "plus-circle";
        break;
      case "1":
        thisIcon = "plus";
        thisSize = 15;
        break;
      case "0":
        thisIcon = "circle-o";
        break;
      case "-1":
        thisIcon = "minus";
        thisSize = 15;
        break;
      case "-2":
        thisIcon = "minus-circle";
        break;
      default:
        thisIcon = "question";
        break;
      }

      return (
        <TouchableOpacity
          onPress={() => {
            this.props.refer.setState({isModalVisible: false});
            setField(this.props.refer, this.props.refer.state.selectedField, item.description);
            saveLocalFields(this.props.refer);
          }}
          style={{flex: 1, flexDirection: 'row', padding: 15, margin: 5,  alignItems: 'center', backgroundColor: '#d7d7d7'}}
          key={index}
        >
          <Icon name={thisIcon} size={thisSize} color="#0084b4" />
          <Text style={{marginLeft: 10, fontSize: 16, position: 'absolute', left: 30}}>{item.description}</Text>
        </TouchableOpacity>
      );
    });

    let showInput = (
      this.props.input == true
      ?
      <TextInput
        style={{height: 40, borderBottomColor: 'blue', borderBottomWidth: 2, marginTop: 35}}
        onChange={(event) => this.setState({inputValue: event.nativeEvent.text})}
        value={this.state.inputValue}
        {...this.props}
      />
      :
      parties
    );
    showInput = (
      this.props.survey == true
      ?
      surveyItems
      :
      showInput
    );

    console.log(this.props.input);

    return (
      <View style={{flexDirection: 'column'}}>
        <View style={{width: Dimensions.get('window').width * 0.7, height: 260, backgroundColor: 'white', marginTop: 15, borderRadius: 15, padding: 25, alignSelf: 'flex-start'}}>
          {
            showInput == surveyItems
            ?
            <View style={{justifyContent: 'center', marginTop: 5}}>
              {showInput}
            </View>
            :
            <View>
            <Text style={{color: 'blue', fontWeight: 'bold', fontSize: 20}}>{this.props.refer.state.selectedField}</Text>
              {showInput}
              <View style={{flexDirection: 'row', position: 'absolute', right: 25, bottom: -35, alignItems: 'center'}}>
                <TouchableOpacity onPress={() => this.props.refer.setState({isModalVisible: false})}>
                  <Text style={{fontWeight: 'bold', color: 'blue'}}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{marginLeft: 30}} onPress={() => {
                  this.props.refer.setState({isModalVisible: false});
                  setField(this.props.refer, this.props.refer.state.selectedField, this.state.inputValue);
                  saveLocalFields(this.props.refer);
                }}>
                  <Text style={{fontWeight: 'bold', color: 'blue'}}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        </View>
      </View>
    );
  }
}
