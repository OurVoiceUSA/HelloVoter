import React from 'react';
import ReactSelect from 'react-select';
import Checkbox from '@material-ui/core/Checkbox';
import './mapselect.css';

export class MapSelect extends React.Component {
  state = {
    checked: this.props.checked || false,
    isMulti: this.props.isMulti || true,
    value: this.props.value,
    map1: '',
    map2: ''
  };

  _handleCheck = () =>
    this.setState({
      checked: !this.state.checked,
      isMulti: !this.state.isMulti,
      value: ''
    });

  _setValue = value => {
    const { sendFormat } = this.props;
    return this.setState(
      { value },
      () => sendFormat && sendFormat(this.state.value)
    );
  };

  _setMapValue = (prop, value) => {
    this.setState({ [prop]: value });
  };

  _calcMapOptions = (value = []) =>
    Array.isArray(value) &&
    value.map((val, i) => {
      if (i === 0) {
        return { value: 1, label: '1st value' };
      } else if (i === 1) {
        return { value: 2, label: '2nd value' };
      } else if (i === 2) {
        return { value: 3, label: '3rd value' };
      } else if (i + 1 === value.length) {
        return {
          value: 'last',
          label: 'Last value'
        };
      }

      return { value: i + 1, label: `${i + 1}th value` };
    });

  render() {
    const {
      label = '',
      options = [],
      checkbox = false,
      dimensions: { width, labelWidth } = { width: 450, labelWidth: 150 }
    } = this.props;
    const { checked, isMulti, value, map1, map2 } = this.state;

    return (
      <div className="mapselect">
        <div style={{ width: labelWidth }}>{label}:</div>{' '}
        <div style={{ width }}>
          <ReactSelect
            className="map-select-input"
            value={value}
            options={options}
            onChange={e => this._setValue(e)}
            isMulti={isMulti}
            placeholder="None"
          />
        </div>
        {checkbox ? this._renderCheckbox({ checked }) : ''}
        {checked
          ? this._renderMapOptions({
              map1,
              map2,
              value
            })
          : ''}
      </div>
    );
  }

  _renderCheckbox = ({ checked }) => (
    <Checkbox
      className="ck-bx"
      onChange={() => this._handleCheck()}
      onClick={() => this._handleCheck()}
      value="ack"
      color="primary"
      checked={checked}
    />
  );

  _renderMapOptions = ({ map1 = '', map2 = '', value = [] }) => (
    <React.Fragment>
      <div style={{ width: 160 }}>
        <ReactSelect
          className="map-option-1"
          onChange={e => this._setMapValue('map1', e)}
          value={map1}
          options={[
            { value: 'comma', label: 'delimited by comma' },
            { value: 'space', label: 'delimited by space' }
          ]}
          placeholder="None"
        />
      </div>
      <div style={{ width: 150 }}>
        <ReactSelect
          className="map-option-2"
          onChange={e => this._setMapValue('map2', e)}
          value={map2}
          options={this._calcMapOptions(value)}
          placeholder="None"
        />
      </div>
    </React.Fragment>
  );
}
