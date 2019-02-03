import React, { Component } from 'react';
import CSVReader from 'react-csv-reader';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button/Button';
import Divider from '@material-ui/core/Divider';
import { faFileCsv } from '@fortawesome/free-solid-svg-icons';
import { ImportPreview, ImportMap } from './';
import { PaperTable, ProgressBar } from '../Elements';
import { fields } from './constants';
import { PAPER_TABLE_SPEC } from './utilities';

import {
  API_BASE_URI,
  notify_error,
  notify_success,
  _fetch,
  _loadImports,
  Icon,
  RootLoader,
} from '../../common';

const defaultState = {
  loading: false,
  sending: false,
  data: null,
  headers: [],
  mapped: [],
  perPage: localStorage.getItem('importsperpage') || 5,
  pageNum: 1,
  submitting: false,
  completed: 0,
};

export default class ImportData extends Component {
  componentDidMount() {
    this._loadData();
  }

  state = {
    server: this.props.server,
    imports: [],
    ...defaultState,
  };

  // #region import methods
  preProcessError(e) {
    notify_error(e, 'Failed to preprocess the import file.');
  }

  preProcess = async (data, filename) => {
    let headers = data.shift();
    data.pop();

    this.setState({ data, headers, filename });
  };

  sendData = async () => {
    const { mapped: data, filename } = this.state;
    const total = data.length;

    this.setState({sending: true, completed: 1});
    await _fetch(this.props.server, API_BASE_URI+'/import/begin', 'POST', {
      filename: filename,
      attributes: ['Party Affiliation'],
    });

    let seps = ['#', 'apt', 'unit', 'ste', 'spc'];
    let sepm = seps.map((i) => i = new RegExp('.* '+i+' ', 'i'));
    let sepr = seps.map((i) => i = new RegExp(' '+i+' .*', 'i'));

    while (data.length) {
      let arr = [];
      for (let i = 0; i < 1000; i++) {
        if (data.length) {
          let row = data.pop();
          // make a reasonable attempt to break Unit from street address
          if (!row[3]) {
            for (let e in seps) {
              if (row[2].match(sepm[e])) {
                row[3] = row[2].replace(sepm[e], "").trim(); // extract unit from address
                row[2] = row[2].replace(sepr[e], "").trim(); // remove unit from address
                break;
              }
            }
          }
          arr.push(row);
        }
      }

      await _fetch(this.props.server, API_BASE_URI+'/import/add', 'POST', {
        filename: filename,
        data: arr,
      });
      const percentage = Math.ceil(((total - data.length) / total) * 100);
      this.setState({ completed: percentage });
    }
    await _fetch(this.props.server, API_BASE_URI+'/import/end', 'POST', {
      filename: filename,
    });

    this.setState({ completed: true });
    notify_success('Upload complete! An import job has been queued and will process soon.');

    setTimeout(() => {
      this.setState({ sending: false});
      this._loadData();
    }, 3000);

  };

  _loadData = async () => {
    let imports = [];
    this.setState({ loading: true });
    try {
      imports = await _loadImports(this);
    } catch (e) {
      notify_error(e, 'Unable to load import data.');
    }
    this.setState({ loading: false, imports }, () => {
      this._resetState();
    });
  };

  _resetState = () => this.setState({ ...defaultState });

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

  // TODO:: load data after completed & reset component state.

  render() {
    const {
      mapped = [],
      data = [],
      headers = [],
      perPage,
      pageNum,
      imports,
      loading,
      completed,
    } = this.state;
    if (loading) return <CircularProgress />;

    if (!headers.length)
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
              spec={PAPER_TABLE_SPEC}
              rows={imports}
              handlePageClick={this.handlePageClick}
              handlePageNumChange={this.handlePageNumChange}
            />
          </RootLoader>
        </div>
      );

    return (
      <div>
        <ProgressBar title="Uploading import file..." completed={completed} />
        <div style={{ display: 'flex' }}>
          <h3>Import Data</h3> &nbsp;&nbsp;&nbsp;
          <Icon icon={faFileCsv} size="3x" />
        </div>
        <ImportMap
          headers={headers}
          fields={fields}
          data={data}
          getMapped={this.getMapped}
        />
        <Divider variant="middle" />
        <br />
        <Button
          disabled={this.state.sending}
          variant="contained"
          color="primary"
          onClick={() => this.sendData()}
        >
          Import
        </Button>
        <br />
        <br />
        <Divider variant="middle" />
        <ImportPreview
          key={this}
          titles={fields}
          records={mapped.slice(0, 3)}
        />
      </div>
    );
  }
}
