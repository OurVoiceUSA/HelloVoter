import React from 'react';
import ReactSelect from 'react-select';
import Checkbox from '@material-ui/core/Checkbox';
import './mapselect.css';

export class MapSelect extends React.Component {
  state = {
    checked: false,
    isMulti: this.props.isMulti || true,
    value: this.props.value
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

  render() {
    const {
      label = '',
      options = [],
      checkbox = false,
      dimensions: { width, labelWidth } = { width: 450, labelWidth: 150 }
    } = this.props;
    const { checked, isMulti, value } = this.state;

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
      <div style={{ width: 160 }}>
        <ReactSelect
          className="map-option-1"
          onChange={e => this._setMapValue('map1', e)}
          value={[{ value: 'space', label: 'delimited by space' }]}
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
