import React, { Component } from 'react';
import CSVReader from 'react-csv-reader';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button/Button';
import Divider from '@material-ui/core/Divider';
import { ImportPreview, ImportMap } from './';
import { PaperTable, ProgressBar } from '../Elements';
import { PAPER_TABLE_SPEC } from './utilities';
import PaperclipIcon from '@material-ui/icons/AttachFile';
import AddIcon from '@material-ui/icons/Add';
import Select from 'react-select';

import {
  notify_error,
  notify_success,
  _fetch,
  _loadImports,
  _loadAttributes,
  RootLoader,
  ucFirst,
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

function value2select(val) {
  return {value: val, label: ucFirst(val)};
}

export default class ImportData extends Component {

  constructor(props) {
    super(props);

    this.state = {
      global: props.global,
      imports: [],
      attributes: [],
      fields: [
        'Unique Record ID',
        'Street Address',
        'Unit',
        'City',
        'State',
        'Zip',
        'Longitude',
        'Latitude',
      ],
      required: [],
      mappedAttributes: [],
      ...defaultState,
    };
  }

  componentDidMount() {
    this._loadData();
  }

  // #region import methods
  preProcessError(e) {
    notify_error(e, 'Failed to preprocess the import file.');
  }

  preProcess = async (data, filename) => {
    let headers = data.shift();
    data.pop();

    this.setState({ data, headers, filename });
  };

  getRequiredFields = async (global) => {
    let required = [];

    try {
      required = await _fetch(global, '/import/required-fields');
    } catch (e) {
      notify_error(e, 'Unable to load required fields.');
    }

    return required;
  };

  sendData = async () => {
    const valid = this.state.required.every((requiredID) => {
      return this.state.mappedAttributes.indexOf(this.state.fields[requiredID]) !== -1;
    })

    if (!valid) {
      notify_error(null, `Required fields: ${this.state.required.map((r)=>this.state.fields[r])}`)
      return
    }

    const { global, fields, mapped: data, filename, required } = this.state;
    const total = data.length;

    this.setState({sending: true, completed: 1});

    await _fetch(global, '/import/begin', 'POST', {
      filename: filename.name,
      attributes: fields.filter((meh,idx) => idx >= 8),
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

      await _fetch(global, '/import/add', 'POST', {
        filename: filename.name,
        data: arr,
      });
      const percentage = Math.ceil(((total - data.length) / total) * 100);
      this.setState({ completed: percentage });
    }
    await _fetch(global, '/import/end', 'POST', {
      filename: filename.name,
    });

    this.setState({ completed: true });
    notify_success('Upload complete! An import job has been queued and will process soon.');

    setTimeout(() => {
      this.setState({ sending: false});
      this._loadData();
    }, 3000);

  };

  _loadData = async () => {
    const { global } = this.state;

    let imports = [];
    let attributes = [];
    let required = [];

    this.setState({ loading: true });
    try {
      attributes = await _loadAttributes(global);
      imports = await _loadImports(global);
      required = await this.getRequiredFields(global);
    } catch (e) {
      notify_error(e, 'Unable to load import data.');
    }
    this.setState({ loading: false, imports, attributes, required }, () => {
      this._resetState();
    });
  };

  _resetState = () => this.setState({ ...defaultState });

  getMapped = (mapped, mappedAttributes) => this.setState({ mapped, mappedAttributes });

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
      attributes,
      fields,
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
          <PaperclipIcon />
          <h3>Import Data</h3> &nbsp;&nbsp;&nbsp;
        </div>
        <ImportMap
          headers={headers}
          fields={fields}
          data={data}
          getMapped={this.getMapped}
        />
        <Divider variant="middle" />
        <br />
        <Select
          value={this.state.selectedAttribute}
          options={attributes.filter(a => fields.indexOf(a.label) === -1).map(a => {
            return {
              value: a.id,
              label: a.name,
            };
          })}
          onChange={(selectedAttribute) => this.setState({selectedAttribute})}
          isMulti={false}
          isSearchable={true}
          placeholder="Select an attribute"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            let { fields, selectedAttribute } = this.state;
            if (!selectedAttribute) return;
            fields.push(selectedAttribute.label);
            this.setState({fields, selectedAttribute: null})
          }}
        >
          <AddIcon /> Add Attribute
          <Divider variant="middle" />
        </Button>
        <br />
        <br />
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
