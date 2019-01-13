import React from 'react';
import { MapSelect } from '../elements';

const formatHeaders = headers =>
  headers.map(i => ({
    value: i,
    label: i
  }));

export const ImportMapForm = ({
  headers = [],
  updateFormats = () => console.warn('Cannot find update format function.')
}) => {
  const options = formatHeaders(headers);
  return (
    <React.Fragment>
      <MapSelect
        label="Unique Record ID"
        updateFormats={updateFormats}
        options={options}
        checkbox
        isMulti
      />

      <MapSelect
        label="Name"
        updateFormats={updateFormats}
        options={options}
        checkbox
        isMulti
      />

      <MapSelect
        label="Street Address"
        updateFormats={updateFormats}
        options={options}
        checkbox
        isMulti
      />

      <MapSelect
        label="City"
        updateFormats={updateFormats}
        options={options}
        checkbox
        isMulti
      />

      <MapSelect
        label="State"
        updateFormats={updateFormats}
        options={options}
        checkbox
        isMulti
      />

      <MapSelect
        label="Zip"
        updateFormats={updateFormats}
        options={options}
        checkbox
        isMulti
      />

      <MapSelect
        label="Longitude"
        updateFormats={updateFormats}
        options={options}
        checkbox
        isMulti
      />

      <MapSelect
        label="Latitude"
        updateFormats={updateFormats}
        options={options}
        checkbox
        isMulti
      />
    </React.Fragment>
  );
};
