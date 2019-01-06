import React from 'react';
import ReactSelect from 'react-select';
import Checkbox from '@material-ui/core/Checkbox';
import './mapselect.css';

export class MapSelect extends React.Component {
  state = { checked: false };

  _handleCheck = () =>
    this.setState({
      checked: !this.state.checked
    });

  render() {
    const {
      label = '',
      value = '',
      options = [],
      checkbox = false,
      isMulti = false,
      dimensions: { width, labelWidth } = { width: 450, labelWidth: 150 }
    } = this.props;
    const { checked } = this.state;

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
        {checkbox ? this._renderCheckbox({ checked }) : ''}
        {checked ? this._renderMapOptions() : ''}
      </div>
    );
  }

  _renderCheckbox = ({ checked }) => (
    <Checkbox
      className="ck-bx"
      onChange={() => this._handleCheck()}
      value="ack"
      color="primary"
      checked={checked}
    />
  );

  _renderMapOptions = () => (
    <React.Fragment>
      <div className="map-option-1" style={{ width: 160 }}>
        <ReactSelect
          value={[{ value: 'space', label: 'delimited by space' }]}
          options={[
            { value: 'comma', label: 'delimited by comma' },
            { value: 'space', label: 'delimited by space' }
          ]}
          placeholder="None"
        />
      </div>
      <div className="map-option-2" style={{ width: 150 }}>
        <ReactSelect
          value={{ value: 1, label: '1st value' }}
          options={[
            { value: 1, label: '1st value' },
            { value: 2, label: '2nd value' },
            { value: 'last', label: 'last value' }
          ]}
          placeholder="None"
        />
      </div>
    </React.Fragment>
  );
}
