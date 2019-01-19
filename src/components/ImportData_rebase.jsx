import React, { Component } from 'react';

import CSVReader from 'react-csv-reader';
import Select from 'react-select';
import ReactPaginate from 'react-paginate';

import Checkbox from '@material-ui/core/Checkbox';
import List from '@material-ui/core/List';

import {
  notify_error,
  notify_success,
  _fetch,
  _loadImports,
  Icon,
  RootLoader
} from '../common.js';

import { faFileCsv } from '@fortawesome/free-solid-svg-icons';

export default class App extends Component {
  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('importsperpage');
    if (!perPage) perPage = 5;

    this.state = {
      server: this.props.server,
      loading: false,
      data: null,
      headers: [],
      imports: [],
      perPage: perPage,
      pageNum: 1
    };

    this.sendData = this.sendData.bind(this);
  }

  componentDidMount() {
    this._loadData();
  }

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

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  };

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

  render() {
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
          <br />
          <br />
          <RootLoader flag={this.state.loading} func={() => this._loadData()}>
            <ListImports imports={this.state.imports} refer={this} />
          </RootLoader>
        </div>
      );
    // import preview / form was here.
    return <div />;
  }
}

const CardImport = props => {
  return (
    <div>
      {JSON.stringify(props.import)}
      <br />
      <br />
      <br />
    </div>
  );
};

const ListImports = props => {
  const perPage = props.refer.state.perPage;
  let paginate = <div />;
  let list = [];

  props.imports.forEach((i, idx) => {
    let tp = Math.floor(idx / perPage) + 1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardImport key={i.filename} import={i} />);
  });

  paginate = (
    <div style={{ display: 'flex' }}>
      <ReactPaginate
        previousLabel={'previous'}
        nextLabel={'next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={props.imports.length / perPage}
        marginPagesDisplayed={1}
        pageRangeDisplayed={8}
        onPageChange={props.refer.handlePageClick}
        containerClassName={'pagination'}
        subContainerClassName={'pages pagination'}
        activeClassName={'active'}
      />
      &nbsp;&nbsp;&nbsp;
      <div style={{ width: 75 }}>
        # Per Page{' '}
        <Select
          value={{ value: perPage, label: perPage }}
          onChange={props.refer.handlePageNumChange}
          options={[
            { value: 5, label: 5 },
            { value: 10, label: 10 },
            { value: 25, label: 25 },
            { value: 50, label: 50 },
            { value: 100, label: 100 }
          ]}
        />
      </div>
    </div>
  );

  return (
    <div>
      <h3>Import History</h3>
      {paginate}
      <List component="nav">{list}</List>
      {paginate}
    </div>
  );
};
