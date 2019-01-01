import React, { Component } from 'react';

import CSVReader from 'react-csv-reader';
import Select from 'react-select';

import Checkbox from '@material-ui/core/Checkbox';

import CircularProgress from '@material-ui/core/CircularProgress';

import { notify_error, notify_success, Icon } from '../common.js';

import {
  faFileCsv,
} from '@fortawesome/free-solid-svg-icons';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      data: null,
      headers: [],
    };
  }

  preProcessError(e) {
    notify_error(e, "Failed to preprocess the import file.");
  }

  preProcess = async (data) => {
    let headers = data.shift();
    data.pop();

    this.setState({data, headers});
  }

  onHeadersSubmit = (evt) => {
    evt.preventDefault();

    this.setState({loading: true});
    // fake data loaded after 3 seconds
    setTimeout(() => {
      notify_success("Data has been imported.")
      this.setState({loading: false, headers: []})
    }, 3000);

  }

  render() {

    if (this.state.loading) return (<CircularProgress />);

    if (!this.state.headers.length) return (
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

    return (
      <div>

        <div style={{display: 'flex'}}>
          <h3>Import Data</h3> &nbsp;&nbsp;&nbsp;
          <Icon icon={faFileCsv} size="3x" />
        </div>

        <div style={{display: 'flex'}}>

          <div style={{width: 150}}>Name:</div> <div style={{width: 450}}><Select
            value={[
              {value: 1, label: "First Name"},
              {value: 1, label: "Middle Initial"},
              {value: 1, label: "Last Name"},
            ]}
            isMulti={true}
            placeholder="None"
          /></div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{display: 'flex'}}>

          <div style={{width: 150}}>Street Address:</div> <div style={{width: 450}}><Select
            value={[
              {value: 1, label: "Street #"},
              {value: 1, label: "Street Name"},
            ]}
            isMulti={true}
            placeholder="None"
          /></div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{display: 'flex'}}>

          <div style={{width: 150}}>City</div> <div style={{width: 450}}><Select
            value={[
              {value: 1, label: "City Name"},
            ]}
            isMulti={true}
            placeholder="None"
          /></div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{display: 'flex'}}>

          <div style={{width: 150}}>State</div> <div style={{width: 450}}><Select
            value={[
            ]}
            isMulti={true}
            placeholder="None"
          /></div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{display: 'flex'}}>

          <div style={{width: 150}}>Zip</div> <div style={{width: 450}}><Select
            value={[
              {value: 1, label: "Postal Code"},
            ]}
            isMulti={true}
            placeholder="None"
          /></div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{display: 'flex'}}>

          <div style={{width: 150}}>Country</div> <div style={{width: 450}}><Select
            value={[
            ]}
            isMulti={true}
            placeholder="None"
          /></div>
          <Checkbox value="ack" color="primary" />
        </div>

        <div style={{display: 'flex'}}>

          <div style={{width: 150}}>Longitude</div> <div style={{width: 450}}><Select
            value={[
              {value: 1, label: "Position"},
            ]}
            isMulti={true}
            placeholder="None"
          /></div>
          <Checkbox value="ack" color="primary" checked />
          <div style={{width: 200}}><Select
            value={[
              {value: 1, label: "delimited by space"},
            ]}
            placeholder="None"
          /></div>
          <div style={{width: 150}}><Select
            value={[
              {value: 1, label: "1st value"},
            ]}
            placeholder="None"
          /></div>

        </div>

        <div style={{display: 'flex'}}>

          <div style={{width: 150}}>Latitude</div> <div style={{width: 450}}><Select
            value={[
              {value: 1, label: "Position"},
            ]}
            isMulti={true}
            placeholder="None"
          /></div>
          <Checkbox value="ack" color="primary" checked />
          <div style={{width: 200}}><Select
            value={[
              {value: 1, label: "delimited by space"},
            ]}
            placeholder="None"
          /></div>
          <div style={{width: 150}}><Select
            value={[
              {value: 1, label: "2st value"},
            ]}
            placeholder="None"
          /></div>

        </div>

        <h3>Sample Records based on selection</h3>

        <div style={{display: 'flex'}}>

          <div>
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Name:</div> <div>Joe Average</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Street Address:</div> <div>838 Wilshire Pl</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>City:</div> <div>Salt Lake City</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>State:</div> <div>NULL</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Zip:</div> <div>84102</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Country:</div> <div>NULL</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Longitude:</div> <div>-111.8688189</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Latitude</div> <div>40.7554569</div>
            </div>
          </div>

          <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>

          <div>
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Joy B. Awesome</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>828 E Sego Ave</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Salt Lake City</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>NULL</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>84102</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>NULL</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>-111.8677287</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>40.7550583</div>
            </div>
          </div>

          <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>

          <div>
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Jake Abomination</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>857 Wilshire Pl</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>Salt Lake City</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>NULL</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>84102</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>NULL</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>-111.8688182</div>
            </div>
            <br />
            <div style={{display: 'flex'}}>
              <div style={{width: 150}}>40.7554561</div>
            </div>
          </div>


        </div>
      </div>
    );
  }
}
