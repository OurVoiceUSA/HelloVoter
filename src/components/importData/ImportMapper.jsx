import React from 'react';
import Checkbox from '@material-ui/core/Checkbox';
import Select from 'react-select';
import { MapSelect } from '../elements';

export const ImportMapper = ({ core_options }) => (
  <React.Fragment>
    <MapSelect
      label="Name"
      options={core_options}
      value={[
        { value: 'First Name', label: 'First Name' },
        { value: 'Middle Initial', label: 'Middle Initial' },
        { value: 'Last Name', label: 'Last Name' }
      ]}
      checkbox
      isMulti
    />

    <MapSelect
      label="Street Address"
      options={core_options}
      value={[
        { value: 'Street #', label: 'Street #' },
        { value: 'Street Name', label: 'Street Name' }
      ]}
      checkbox
      isMulti
    />

    <MapSelect
      label="City"
      options={core_options}
      value={[{ value: 'City Name', label: 'City Name' }]}
      checkbox
      isMulti
    />

    <MapSelect
      label="State"
      options={core_options}
      value={[]}
      checkbox
      isMulti
    />

    <MapSelect
      label="Zip"
      options={core_options}
      value={[{ value: 'Postal Code', label: 'Postal Code' }]}
      checkbox
      isMulti
    />

    <MapSelect
      label="Country"
      options={core_options}
      value={[]}
      checkbox
      isMulti
    />

    <div style={{ display: 'flex' }}>
      <div style={{ width: 150 }}>Longitude:</div>{' '}
      <div style={{ width: 450 }}>
        <Select
          value={{ value: 'Position', label: 'Position' }}
          options={core_options}
          isMulti={false} // can't be multi value when splitting on a delimiter
          placeholder="None"
        />
      </div>
      <Checkbox value="ack" color="primary" checked />
      <div style={{ width: 200 }}>
        <Select
          value={[{ value: 'space', label: 'delimited by space' }]}
          options={[
            { value: 'comma', label: 'delimited by comma' },
            { value: 'space', label: 'delimited by space' }
          ]}
          placeholder="None"
        />
      </div>
      <div style={{ width: 150 }}>
        <Select
          value={{ value: 1, label: '1st value' }}
          options={[
            { value: 1, label: '1st value' },
            { value: 2, label: '2nd value' },
            { value: 'last', label: 'last value' }
          ]}
          placeholder="None"
        />
      </div>
    </div>

    <div style={{ display: 'flex' }}>
      <div style={{ width: 150 }}>Latitude:</div>{' '}
      <div style={{ width: 450 }}>
        <Select
          value={{ value: 'Position', label: 'Position' }}
          options={core_options}
          isMulti={false} // can't be multi value when splitting on a delimiter
          placeholder="None"
        />
      </div>
      <Checkbox value="ack" color="primary" checked />
      <div style={{ width: 200 }}>
        <Select
          value={[{ value: 'space', label: 'delimited by space' }]}
          options={[
            { value: 'comma', label: 'delimited by comma' },
            { value: 'space', label: 'delimited by space' }
          ]}
          placeholder="None"
        />
      </div>
      <div style={{ width: 150 }}>
        <Select
          value={{ value: 2, label: '2nd value' }}
          options={[
            { value: 1, label: '1st value' },
            { value: 2, label: '2nd value' },
            { value: 'last', label: 'last value' }
          ]}
          placeholder="None"
        />
      </div>
    </div>
  </React.Fragment>
);
