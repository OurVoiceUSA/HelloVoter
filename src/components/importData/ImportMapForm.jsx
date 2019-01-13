import React from 'react';
import { MapSelect } from '../elements';

const formatHeaders = headers =>
  headers.map(i => ({
    value: i,
    label: i
  }));

export const ImportMapForm = ({ headers = [] }) => {
  const options = formatHeaders(headers);
  return (
    <React.Fragment>
      <MapSelect label="Name" options={options} checkbox isMulti />

      <MapSelect label="Street Address" options={options} checkbox isMulti />

      <MapSelect label="City" options={options} checkbox isMulti />

      <MapSelect label="State" options={options} checkbox isMulti />

      <MapSelect label="Zip" options={options} checkbox isMulti />

      <MapSelect label="Unique ID" options={options} checkbox isMulti />

      <MapSelect label="Longitude" options={options} checkbox isMulti />

      <MapSelect label="Latitude" options={options} checkbox isMulti />
    </React.Fragment>
  );
};
