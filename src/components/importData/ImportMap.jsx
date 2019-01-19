import React from 'react';
import map from 'lodash/map';
import { MapSelect } from '../elements';
import { map_format } from './constants';
import { pipe } from './utilities';

export class ImportMap extends React.Component {
  state = {
    data: this.props.data || [],
    headers: this.props.headers || [],
    map_format: map_format,
    formats: {},
    mapped: []
  };

  formatHeaders = headers =>
    headers.map(i => ({
      value: i,
      label: i
    }));

  updateFormats = (field, obj) =>
    this.setState({ formats: { ...this.state.formats, [field]: obj } }, () =>
      this.updateMapped()
    );

  updateMapped = () =>
    this.setState(
      {
        mapped: this.mapData(this.state) || []
      },
      () => this.props.getMapped && this.props.getMapped(this.state.mapped)
    );

  mapData = ({ formats, map_format }) => {
    const { generateFormats, getAllIndexes, parseData } = this;
    return pipe(
      generateFormats,
      getAllIndexes,
      parseData
    )(formats, map_format);
  };

  generateFormats = (formats, map_format) => {
    return map(map_format, item => {
      if (formats[item]) {
        return {
          name: item,
          format: formats[item]
        };
      }

      return {
        name: item,
        format: null
      };
    });
  };

  getAllIndexes = arr =>
    map(arr, ({ name, format }) => {
      if (format && Array.isArray(format.value)) {
        const indexes = format.value.map(f =>
          this.state.headers.findIndex(i => i === f.value)
        );
        return { name, format, indexes };
      } else if (format) {
        const indexes = this.state.headers.findIndex(
          i => i === format.value.value
        );
        return {
          name,
          format,
          indexes
        };
      }

      return { name, format, indexes: null };
    });

  parseData = arr => {
    const { data } = this.state;
    return map(data, item => {
      return map(arr, ({ indexes, format }) => {
        if (indexes && Array.isArray(indexes)) {
          return indexes
            .reduce((total, next) => `${total.trim()} ${item[next].trim()}`, '')
            .trim();
        } else if (indexes) {
          return item[indexes]
            ? item[indexes].split(format.map1.value)[format.map2.value]
            : '';
        }

        return '';
      });
    });
  };

  render() {
    const {
      updateFormats = () => console.warn('Cannot find update format function.')
    } = this;
    const { headers = [] } = this.state;
    const options = this.formatHeaders(headers);

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
  }
}
