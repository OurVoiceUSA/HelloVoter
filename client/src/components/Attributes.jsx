import React, { Component } from 'react';

import Select from 'react-select';

import {
  API_BASE_URI,
  _fetch,
  _loadAttributes,
  _searchStringify,
  RootLoader,
} from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    this._init();
  }

  _init = async () => {
    this.setState({ loading: true });

    let attributeOptions = [];
    let attributes = await _loadAttributes(this);

    attributes.forEach(a => {
      attributeOptions.push({
        value: _searchStringify(a),
        id: a.id,
        label: a.name,
        data: a,
      });
    });

    this.setState({loading: false, attributeOptions});
  }

  handleAttributeChange = selectedAttributeOption => {
    if (!selectedAttributeOption) selectedAttributeOption = [];
    this.setState({selectedAttributeOption});
  }

  render() {
    return (
      <RootLoader flag={this.state.loading} func={() => this._init()}>
        <h3>Attributes</h3>
        <Select
          value={this.state.selectedAttributeOption}
          onChange={this.handleAttributeChange}
          options={this.state.attributeOptions}
          isMulti={false}
          isSearchable={true}
          placeholder="Select an attribute to edit"
        />
      {this.state.selectedAttributeOption?
      <div>{JSON.stringify(this.state.selectedAttributeOption.data)}</div>
      :
      <div></div>
      }
      </RootLoader>
    );
  }
}
