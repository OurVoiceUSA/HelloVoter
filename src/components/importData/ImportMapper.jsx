import React from 'react';
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

    <MapSelect
      label="Longitude"
      options={core_options}
      value={[{ value: 'Position', label: 'Position' }]}
      checkbox
      isMulti
    />

    <MapSelect
      label="Latitude"
      options={core_options}
      value={{ value: 'Position', label: 'Position' }}
      checkbox
      isMulti
    />
  </React.Fragment>
);
