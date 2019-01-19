import React, { Component } from 'react';
import CSVReader from 'react-csv-reader';
import CircularProgress from '@material-ui/core/CircularProgress';
import { faFileCsv } from '@fortawesome/free-solid-svg-icons';
import map from 'lodash/map';
import { ImportPreview, ImportMapForm } from './';
import { notify_error, notify_success, Icon } from '../../common.js';
import { pipe } from './utilities';

const map_format = [
  'Unique Record ID',
  'Name',
  'Street Address',
  'City',
  'State',
  'Zip',
  'Longitude',
  'Latitude'
];

export default class ImportData extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      data: null,
      headers: [],
      map_format,
      formats: {},
      mapped: []
    };
  }

  preProcessError(e) {
    notify_error(e, 'Failed to preprocess the import file.');
  }

  preProcess = async data => {
    let headers = data.shift();
    data.pop();

    this.setState({ data, headers });
  };

  onHeadersSubmit = evt => {
    evt.preventDefault();

    this.setState({ loading: true });
    // fake data loaded after 3 seconds
    setTimeout(() => {
      notify_success('Data has been imported.');
      this.setState({
        loading: false,
        headers: []
      });
    }, 3000);
  };

  updateFormats = (field, obj) =>
    this.setState({ formats: { ...this.state.formats, [field]: obj } }, () =>
      this.updateMapped()
    );

  updateMapped = () =>
    this.setState({
      mapped: this.mapData(this.state) || []
    });

  mapData = ({ formats, map_format }) => {
    const { generateFormats, getAllIndexes, parseData } = this;
    return pipe(
      generateFormats,
      getAllIndexes,
      parseData
    )(formats, map_format);
  };

  generateFormats = (formats, map_format) => {
    const { repeat } = this;
    var Formats = [];
    repeat(map_format, item => {
      if (formats[item]) {
        Formats.push({
          name: item,
          format: formats[item]
        });
      } else {
        Formats.push({
          name: item,
          format: null
        });
      }
    });

    return Formats;
  };

  getAllIndexes = arr =>
    arr.map(({ name, format }) => {
      if (format) {
        const indexes = format.value.map(f =>
          this.state.headers.findIndex(i => i === f.value)
        );
        return { name, format, indexes };
      }

      return { name, format, indexes: null };
    });

  parseData = arr => {
    const { data } = this.state;
    return map(data, item => {
      return map(arr, head => {
        if (head.indexes) {
          return head.indexes
            .reduce((total, next) => `${total.trim()} ${item[next].trim()}`, '')
            .trim();
        }

        return '';
      });
    });
  };

  repeat = (arr, callback) => {
    for (var i = 0; i < arr.length; i++) {
      callback(arr[i]);
    }
  };

  render() {
    if (this.state.loading) return <CircularProgress />;

    if (!this.state.headers.length)
      return (
        <div>
          <CSVReader
            label="Data Importa"
            onError={this.preProcessError}
            onFileLoaded={this.preProcess}
          />
          <br />
          <h3>Select a CSV file to get to the next menu!</h3>
          (Also want the user to be able to drag&drop files.)
        </div>
      );

    console.log('FORMATS: ', this.state.formats);

    // TODO:
    // format data with format object
    // pass first formatted data result index to <ImportPreview /> and display
    // create submit import data <Button />
    return (
      <div>
        <div style={{ display: 'flex' }}>
          <h3>Import Data</h3> &nbsp;&nbsp;&nbsp;
          <Icon icon={faFileCsv} size="3x" />
        </div>
        <ImportMapForm
          headers={this.state.headers}
          updateFormats={this.updateFormats}
        />
        <ImportPreview />
      </div>
    );
  }
}
