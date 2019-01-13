import React, { Component } from 'react';
import CSVReader from 'react-csv-reader';
import CircularProgress from '@material-ui/core/CircularProgress';
import { faFileCsv } from '@fortawesome/free-solid-svg-icons';
import { ImportPreview, ImportMapForm } from './';
import { notify_error, notify_success, Icon } from '../../common.js';

export default class ImportData extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      data: null,
      headers: [],
      formats: {}
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
      this.setState({ loading: false, headers: [] });
    }, 3000);
  };

  updateFormats = (field, obj) =>
    this.setState({
      formats: {
        ...this.state.formats,
        [field]: obj
      }
    });

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

    console.log(this.state);
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
