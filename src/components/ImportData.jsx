import React, { Component } from 'react';

import CSVReader from 'react-csv-reader';
import Select from 'react-select';
import ReactPaginate from 'react-paginate';

import Checkbox from '@material-ui/core/Checkbox';
import List from '@material-ui/core/List';

import {
  notify_error, notify_success, _fetch, _loadImports,
  Icon, RootLoader
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
      pageNum: 1,
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

  sendData = async () => {

    // This is an example of the "flow" of a data import; once the user submits,
    // send the data in this manner .. start with a "import/begin", send the data in batches
    // with "import/add", and finish with a call to "import/end"

    let filename = "Test1.csv";
    await _fetch(this.props.server, "/volunteer/v1/import/begin", "POST", {
      filename: filename,
    });
    await _fetch(this.props.server, "/volunteer/v1/import/add", "POST", {
      filename: filename,
      data: [
        // id, name, street address, unit #, city, state, zip, lng, lat
        // must explicity give all fields, even if empty. And "id" can be empty, and in fact usually is
        ["", "Joe Average", "4523 South Redwood Road", "Unit A", "Taylorsville", "UT", "", "", ""],
        ["", "Joy Awesome", "4523 South Redwood Road", "Unit A", "Taylorsville", "UT", "", "", ""],
        ["", "Girl Next Door", "4523 South Redwood Road", "Unit C", "Taylorsville", "UT", "", "", ""],
        ["", "Joe Medium", "221 Fort Union Boulevard", "", "Midvale", "UT", "", "", ""],
        ["", "Kama Ina", "55-423 Naniloa Loop", "", "Laie", "HI", "96762", "", ""],
        ["", "Angela Crawford", "1561 Ponderosa Ln", "", "West Jordan", "UT", "84088", "", ""],
        ["", "Andrew Stoddard", "6051 S MOHICAN CIR", "Apt 22", "Murray", "UT", "84123", "", ""],
        ["", "Kathleen Riebe", "3177 E FORT UNION BLVD", "", "", "UT", "84121", "", ""],
        ["", "", "3171 E FORT UNION BLVD", "", "", "UT", "84121", "", ""],
        ["", "Mr Man Riebe", "3177 E FORT UNION BLVD", "", "", "UT", "84121", "", ""],
        ["", "Mrs. Error Prone", "4567 Fukukulala Error Blvd", "", "", "BLAH", "", "", ""],
        ["", "Booga Woga", "3151 EAST FORT UNION BLVD", "Apt A", "", "UT", "84121", "", ""],
        ["", "", "3151 E FORT UNION BLVD", "Apt A", "", "UT", "84121", "", ""],
        ["", "", "3151 E FORT UNION BLVD", "Apt B", "", "UT", "84121", "", ""],
        ["", "", "3151 E FORT UNION BLVD", "Apt C", "", "UT", "84121", "", ""],
      ],
    });
    await _fetch(this.props.server, "/volunteer/v1/import/add", "POST", {
      filename: filename,
      data: [
        // id, name, street address, unit #, city, state, zip, lng, lat
        // must explicity give all fields, even if empty. And "id" can be empty, and in fact usually is
        ["", "Joey Avenger", "4521 South Redwood Road", "", "Taylorsville", "UT", "", "", ""],
        ["", "Joseph Medium", "225 Fort Union Boulevard", "", "Midvale", "UT", "", "", ""],
        ["", "Kama InaHama", "55-425 Naniloa Loop", "", "Laie", "HI", "96762", "", ""],
        ["", "Andry Stoddard", "6053 S MOHICAN CIR", "", "Murray", "UT", "84123", "", ""],
        ["", "Ben Stoddard", "6053 S MOHICAN CIR", "", "Murray", "UT", "84123", "", ""],
        ["", "Katlyn Riebe", "3172 E FORT UNION BLVD", "", "", "UT", "84121", "", ""],
        ["", "Mr. Error Prone", "1234 Fukukulala Error Blvd", "", "", "BLAH", "", "", ""],
        ["", "", "2017 New Hope Rd", "", "Fordland", "MO", "65652", "", "" ],
      ],
    });
    await _fetch(this.props.server, "/volunteer/v1/import/end", "POST", {
      filename: filename,
    });
  }

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

    let sample_headers_from_csv = [
      'First Name',
      'Middle Initial',
      'Last Name',
      'Street #',
      'Street Name',
      'City Name',
      'Postal Code',
      'Position'
    ];

    // convert headers to Select
    let core_options = [];
    sample_headers_from_csv.forEach(i =>
      core_options.push({ value: i, label: i })
    );

    return (
      <div>
        <div style={{ display: 'flex' }}>
          <h3>Import Data</h3> &nbsp;&nbsp;&nbsp;
          <Icon icon={faFileCsv} size="3x" />
        </div>

        <div style={{ display: 'flex' }}>
          Street Address is required. Everything else is optional, but the more fields you assign, the less likely they'll fail to imoprt.
        </div>
        <br />

        <div style={{ display: 'flex' }}>
            <div style={{ width: 150 }}>Unique Record ID:</div>{' '}
          <div style={{ width: 450 }}>
            <Select
              options={core_options}
              isMulti={true}
              placeholder="Auto-generated if this is left blank"
            />
          </div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: 150 }}>Name:</div>{' '}
          <div style={{ width: 450 }}>
            <Select
              value={[
                { value: 'First Name', label: 'First Name' },
                { value: 'Middle Initial', label: 'Middle Initial' },
                { value: 'Last Name', label: 'Last Name' }
              ]}
              options={core_options}
              isMulti={true}
              placeholder="None"
            />
          </div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: 150 }}>Street Address:</div>{' '}
          <div style={{ width: 450 }}>
            <Select
              value={[
                { value: 'Street #', label: 'Street #' },
                { value: 'Street Name', label: 'Street Name' }
              ]}
              options={core_options}
              isMulti={true}
              placeholder="None"
            />
          </div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: 150 }}>Unit/Apartment #:</div>{' '}
          <div style={{ width: 450 }}>
            <Select
              options={core_options}
              isMulti={true}
              placeholder="None"
            />
          </div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: 150 }}>City</div>{' '}
          <div style={{ width: 450 }}>
            <Select
              value={[{ value: 'City Name', label: 'City Name' }]}
              options={core_options}
              isMulti={true}
              placeholder="None"
            />
          </div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: 150 }}>State</div>{' '}
          <div style={{ width: 450 }}>
            <Select
              value={[]}
              options={core_options}
              isMulti={true}
              placeholder="None"
            />
          </div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: 150 }}>Zip</div>{' '}
          <div style={{ width: 450 }}>
            <Select
              value={[{ value: 'Postal Code', label: 'Postal Code' }]}
              options={core_options}
              isMulti={true}
              placeholder="None"
            />
          </div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: 150 }}>Longitude</div>{' '}
          <div style={{ width: 450 }}>
            <Select
              value={{ value: 'Position', label: 'Position' }}
              options={core_options}
              isMulti={false} // can't be multi value when splitting on a delimiter
              placeholder="None"
            />
          </div>
          <Checkbox value="ack" color="primary" checked />
          <div style={{ width: 200 }}>
            <Select
              value={[{ value: 'space', label: 'delimited by space' }]}
              options={[
                { value: 'comma', label: 'delimited by comma' },
                { value: 'space', label: 'delimited by space' }
              ]}
              placeholder="None"
            />
          </div>
          <div style={{ width: 150 }}>
            <Select
              value={{ value: 1, label: '1st value' }}
              options={[
                { value: 1, label: '1st value' },
                { value: 2, label: '2nd value' },
                { value: 'last', label: 'last value' }
              ]}
              placeholder="None"
            />
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: 150 }}>Latitude</div>{' '}
          <div style={{ width: 450 }}>
            <Select
              value={{ value: 'Position', label: 'Position' }}
              options={core_options}
              isMulti={false} // can't be multi value when splitting on a delimiter
              placeholder="None"
            />
          </div>
          <Checkbox value="ack" color="primary" checked />
          <div style={{ width: 200 }}>
            <Select
              value={[{ value: 'space', label: 'delimited by space' }]}
              options={[
                { value: 'comma', label: 'delimited by comma' },
                { value: 'space', label: 'delimited by space' }
              ]}
              placeholder="None"
            />
          </div>
          <div style={{ width: 150 }}>
            <Select
              value={{ value: 2, label: '2nd value' }}
              options={[
                { value: 1, label: '1st value' },
                { value: 2, label: '2nd value' },
                { value: 'last', label: 'last value' }
              ]}
              placeholder="None"
            />
          </div>
        </div>

        <h3>Sample Records based on selection</h3>

        <div style={{ display: 'flex' }}>
          <div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Unique Record ID:</div> <div>(auto-generate)</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Name:</div> <div>Joe Average</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Street Address:</div>{' '}
              <div>838 Wilshire Pl</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Unit/Apartment #:</div>{' '}
              <div>NULL</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>City:</div> <div>Salt Lake City</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>State:</div> <div>NULL</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Zip:</div> <div>84102</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Longitude:</div>{' '}
              <div>-111.8688189</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Latitude</div> <div>40.7554569</div>
            </div>
          </div>

          <div>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </div>

          <div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>(auto-generate)</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Joy B. Awesome</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>828 E Sego Ave</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>NULL</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Salt Lake City</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>NULL</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>84102</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>-111.8677287</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>40.7550583</div>
            </div>
          </div>

          <div>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </div>

          <div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>(auto-generate)</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Jake Abomination</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>857 Wilshire Pl</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>NULL</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>Salt Lake City</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>NULL</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>84102</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>-111.8688182</div>
            </div>
            <br />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 150 }}>40.7554561</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const CardImport = props => {
  return (<div>{JSON.stringify(props.import)}<br /><br /><br /></div>);
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
      <h3>
        Import History
      </h3>
      {paginate}
      <List component="nav">{list}</List>
      {paginate}
    </div>
  );
};
