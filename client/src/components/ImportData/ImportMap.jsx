import React from 'react';
import map from 'lodash/map';
import { MapSelect } from '../Elements';
import { pipe } from './utilities';

export class ImportMap extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      data: this.props.data || [],
      headers: this.props.headers || [],
      fields: props.fields,
      formats: {},
      mapped: [],
    };
  }

  formatHeaders = headers =>
    headers.map(i => ({
      value: i,
      label: i,
    }));

  updateFormats = (field, obj) =>
    this.setState({ formats: { ...this.state.formats, [field]: obj } }, () =>
      this.updateMapped()
    );

  updateMapped = () =>
    this.setState(
      {
        mapped: this.mapData(this.state) || [],
      },
      () => {
        const mappedAttributes = Object.keys(this.state.formats).map((key) => {
          if (this.state.formats[key] && this.state.formats[key].value && this.state.formats[key].value.length > 0) {
            return key
          }
        })
        const test = mappedAttributes.filter((k) => k);
        this.props.getMapped && this.props.getMapped(this.state.mapped, mappedAttributes)
      }
    );

  mapData = ({ formats, fields }) => {
    const { generateFormats, getAllIndexes, parseData } = this;
    return pipe(
      generateFormats,
      getAllIndexes,
      parseData
    )(formats, fields);
  };

  generateFormats = (formats, fields) => {
    return map(fields, item => {
      if (formats[item]) {
        return {
          name: item,
          format: formats[item],
        };
      }

      return {
        name: item,
        format: null,
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
          i => format.value && i === format.value.value
        );
        return {
          name,
          format,
          indexes,
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
      updateFormats = () => console.warn('Cannot find update format function.'),
    } = this;
    const { fields = [] } = this.props;
    const { headers = [] } = this.state;
    const options = this.formatHeaders(headers);

    return (
      <React.Fragment>
        {fields.map(field => (
          <MapSelect
            key={field}
            label={field}
            updateFormats={updateFormats}
            options={options}
            checkbox
            isMulti
          />
        ))}
      </React.Fragment>
    );
  }
}
