import React, { Component } from 'react';

import CSVReader from 'react-csv-reader';
import t from 'tcomb-form';

import { Loader } from '../common.js';

const HEADER = t.enums({
  'address1': 'Address 1',
  'address2': 'Address 2',
  'city': 'City',
  'state': 'State',
  'zip': 'Zip Code',
}, 'HEADER');

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
    console.warn("BOOO = "+e);
  }

  preProcess = async (data) => {
    let headers = data.shift();
    data.pop();

    this.setState({data, headers});
  }

  onHeadersSubmit = (evt) => {
    evt.preventDefault();

  /*
    const value = this.refs.form.getValue();

    if (value) {
      // required import fields
      let address1 = null;
      let address2 = null;
      let city = null;
      let state = null;
      let zip = null;

      for (let val in value) {
        let v = value[val];
        if (v === 'address1') address1 = val;
        if (v === 'address2') address2 = val;
        if (v === 'city') city = val;
        if (v === 'state') state = val;
        if (v === 'zip') zip = val;
      }

      if (address1 == null || address2 == null || city == null || state == null || zip == null) {
        this.setState({formError: 'All address elements must be assigned'});
        return;
      }

      this.processData(address1, address2, city, state, zip);
    }
  */

    this.setState({loading: true});
    // fake data loaded after 3 seconds
    setTimeout(() => this.setState({loading: false}), 3000);

  }

  render() {

    if (this.state.loading) return (<Loader />);

    if (this.state.headers.length) {
      let obj = {};

      let FormOptions = {fields: {}};

      for (let h in this.state.headers) {
        obj[h] = t.maybe(HEADER);
        FormOptions.fields[h] = {label: this.state.headers[h]};
      }

      let FormSchema = t.struct(obj);

      return (
        <div>
          Assign each header to its data type <br />

          <form onSubmit={this.onHeadersSubmit}>
            <t.form.Form ref="form" type={FormSchema} options={FormOptions} />
            <div className="form-group">
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>

          <hr />
            NOTE: This import tool does not work on all voter files, as there is no standard format.
            We do our best to accommodate the most common patterns. If your import doesn't work,&nbsp;
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/OurVoiceUSA/HelloVoter/issues/new">
            submit an issue</a> and a volunteer programmer can work to fix the issue in the future.
            If you need the import done now, contact someone you know who's good with Microsoft&copy; Excel
            or LibreOffice&copy; and they can reformat your voter file so it works with this import tool.
        </div>
        );
    }

    return (
      <CSVReader
        label="Data Importa"
        onError={this.preProcessError}
        onFileLoaded={this.preProcess}
      />
    );
  }
}
