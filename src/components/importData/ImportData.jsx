import React, { Component } from 'react';
import CSVReader from 'react-csv-reader';
import CircularProgress from '@material-ui/core/CircularProgress';
import { faFileCsv } from '@fortawesome/free-solid-svg-icons';
import { ImportPreview, ImportMap } from './';
import { PaperTable } from '../elements';
import { map_format } from './constants';
import {
  notify_error,
  notify_success,
  _fetch,
  _loadImports,
  jobRuntime,
  jobNumber,
  Icon,
  RootLoader
} from '../../common';

export default class ImportData extends Component {
  componentDidMount() {
    this._loadData();
  }

  state = {
    server: this.props.server,
    loading: false,
    data: null,
    headers: [],
    mapped: [],
    imports: [],
    perPage: localStorage.getItem('importsperpage') || 5,
    pageNum: 1
  };

  // #region import methods
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

  sendData = async () => {
    // This is an example of the "flow" of a data import; once the user submits,
    // send the data in this manner .. start with a "import/begin", send the data in batches
    // with "import/add", and finish with a call to "import/end"

    let filename = 'Test1.csv';
    await _fetch(this.props.server, '/volunteer/v1/import/begin', 'POST', {
      filename: filename
    });
    await _fetch(this.props.server, '/volunteer/v1/import/add', 'POST', {
      filename: filename,
      data: []
    });
    await _fetch(this.props.server, '/volunteer/v1/import/add', 'POST', {
      filename: filename,
      data: []
    });
    await _fetch(this.props.server, '/volunteer/v1/import/end', 'POST', {
      filename: filename
    });
  };

  _loadData = async () => {
    let imports = [];
    this.setState({ loading: true });
    try {
      imports = await _loadImports(this);
    } catch (e) {
      notify_error(e, 'Unable to load import data.');
    }
    this.setState({ loading: false, imports });
  };

  getMapped = mapped => this.setState({ mapped });

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  };

  // #endregion

  /*
  Items not yet shown in the table:
  "num_people"
  "num_addresses"
  "geocode_success"
  "goecode_fail"
  "dupes_address"
  */

  render() {
    const { mapped = [], perPage, pageNum, imports } = this.state;
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
          <br />
          <br />
          <RootLoader flag={this.state.loading} func={() => this._loadData()}>
            <PaperTable
              perPage={perPage}
              pageNum={pageNum}
              spec={[
                {
                  header: "Import File",
                  tooltip: "The file name of the imported file.",
                  params: ['filename']
                },
                {
                  header: "Upload Time",
                  tooltip: "The time it took the file to go from the uploader's computer to the server.",
                  func: jobRuntime,
                  params: ['created', 'submitted']
                },
                {
                  header: "Queue Delay",
                  tooltip: "The time this import had to wait in queue for other jobs to finish.",
                  func: jobRuntime,
                  params: ['submitted', 'parse_start'],
                },
                {
                  header: "Prase time",
                  tooltip: "The file name of the imported file.",
                  func: jobRuntime,
                  params: ['parse_start', 'parse_end'],
                },
                {
                  header: "Record Count",
                  tooltip: "The number of unique records contained in the import file.",
                  func: jobNumber,
                  params: ['num_records'],
                },
                {
                  header: "Geocode Time",
                  tooltip: "The time it took the system to geocode the addresses in the import file.",
                  func: jobRuntime,
                  params: ['geocode_start', 'geocode_end'],
                },
                {
                  header: "Dedupe Time",
                  tooltip: "The time it took the system to identify and remove duplicates as a result of this import.",
                  func: jobRuntime,
                  params: ['dedupe_start', 'dedupe_end'],
                },
                {
                  header: "Index Time",
                  tooltip: "The time it took to add these addresses to the master database index.",
                  func: jobRuntime,
                  params: ['index_start', 'index_end'],
                },
                {
                  header: "Turf Index Time",
                  tooltip: "The time it took the system to index each address to turfs it belongs to.",
                  func: jobRuntime,
                  params: ['turfadd_start', 'turfadd_end'],
                },
                {
                  header: "Total Time",
                  tooltip: "The total time the import took from file upload start to complete finish.",
                  func: jobRuntime,
                  params: ['created', 'completed'],
                },
              ]}
              rows={imports}
              handlePageClick={this.handlePageClick}
              handlePageNumChange={this.handlePageNumChange}
            />
          </RootLoader>
        </div>
      );

    return (
      <div>
        <div style={{ display: 'flex' }}>
          <h3>Import Data</h3> &nbsp;&nbsp;&nbsp;
          <Icon icon={faFileCsv} size="3x" />
        </div>
        <ImportMap
          headers={this.state.headers}
          data={this.state.data}
          getMapped={this.getMapped}
        />
        <ImportPreview
          key={this}
          titles={map_format}
          records={mapped.slice(0, 3)}
        />
      </div>
    );
  }
}
