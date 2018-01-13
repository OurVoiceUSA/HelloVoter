import React from 'react';
import {
  AsyncStorage
} from 'react-native';

export const setField = (_this, field, value) => {
  let fs = _this.state.surveyData;
  const fields = fs.filter((f) => {
    return f.field == field;
  });

  if (fields[0]) {
    const index = _this.state.surveyData.indexOf(fields[0]);
    fields[0].value = value;
    fs[index] = fields[0];
  }

  _this.setState({surveyData: fs});
}

export const saveLocalFields = async (_this) => {
  const key = 'OV_TMP';
  const fields = _this.state.surveyData;

  const { state } = _this.props.navigation;

  const json = {
    [state.params.userId]: {
      [state.params.pinId]: {
        datetime: (new Date).getTime(),
        status: '',
        address: state.params.address,
        fields: fields,
      }
    }
  };

  try {
    const jsonS = JSON.stringify(json);
    await AsyncStorage.setItem(key, jsonS);
  } catch (error) {
    console.error(error);
  }
}

export const getLocalFields = async (_this) => {
  const key = 'OV_TMP';
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      // success
      const json = JSON.parse(value);
      _this.setState({json: json});
    }
  } catch (error) {
    console.error(error);
  }
}

