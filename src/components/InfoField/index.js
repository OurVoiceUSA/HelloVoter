import React, { PureComponent } from 'react';
import {
  Switch,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';

import { setField, saveLocalFields, getLocalFieldsPromise} from '../../util/fields';

export default class InfoField extends PureComponent {
  constructor() {
    super();

    this.state = {
      value: '',
    };
  }

  render() {
    const centerStyle =
    (this.props.isSwitch)
    ?
    {alignItems: 'center'}
    :
    {justifyContent: 'center'};

    return (
      <View style={{flexDirection: 'row'}}>
        <TouchableOpacity
          style={[{flex: 1, flexDirection: (this.props.isSwitch == true) ? 'row' : 'column', padding: 15}, centerStyle]}
          onPress={() => {
            if (this.props.viewOnly !== true)
              this.props.refer.setState({
                isModalVisible: (this.props.isSwitch == true) ? false : true,
                selectedField: this.props.title,
                isModalTextInput: (this.props.title != 'Party Affiliation')
              });
          }}
        >

          <Text style={{color: 'black', fontSize: 16, fontWeight: '500'}}>
            {this.props.title}
          </Text>

          {
            this.props.isSwitch == true
            ?
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              <Switch value={this.state.value == 'true'} onValueChange={(value) => {
                this._selectedSwitch(value);
              }} />
            </View>
            :
            <Text style={{color: 'gray', fontSize: 14, marginTop: 3}}>
              {this.props.value}
            </Text>
          }

        </TouchableOpacity>
      </View>
    );
  }

  _selectedSwitch = (val) => {
    setField(this.props.refer, this.props.title, val);
    saveLocalFields(this.props.refer);
    this.setState({value: '' + val});
    console.log(val);
  }
}
