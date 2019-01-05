import React from 'react';
import ReactSelect from 'react-select';
import Checkbox from '@material-ui/core/Checkbox';
import './mapselect.css';

export class MapSelect extends React.Component {
  state = {};

  render() {
    const {
      label = '',
      value = '',
      options = [],
      checkbox = false,
      isMulti = false,
      dimensions: { width, labelWidth } = { width: 450, labelWidth: 150 }
    } = this.props;

    return (
      <div className="mapselect">
        <div style={{ width: labelWidth }}>{label}:</div>{' '}
        <div style={{ width }}>
          <ReactSelect
            value={value}
            options={options}
            isMulti={isMulti}
            placeholder="None"
          />
        </div>
        {checkbox ? <Checkbox value="ack" color="primary" /> : ''}
      </div>
    );
  }
}
