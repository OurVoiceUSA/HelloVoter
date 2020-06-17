import React, { Component } from 'react';

import Select from 'react-select';

import CircularProgress from '@material-ui/core/CircularProgress';

import {
  PlacesAutocomplete,
} from '../../common.js';

var us_states = [];

export class TurfOptions extends Component {
  handleStateChange = selectedStateOption => {
    if (!selectedStateOption) selectedStateOption = [];
    this.setState({
      typeOptions: [
        { value: 'state', label: 'State' },
        { value: 'cd', label: 'Congressional' },
        { value: 'sldu', label: us_states[selectedStateOption.value].sldu },
        { value: 'sldl', label: us_states[selectedStateOption.value].sldl },
      ],
    });
    this.props.refer.handleStateChange(selectedStateOption);
  }

  render() {
    if (!this.props.refer.state.selectedDrawOption) return <br />;

    let stateOptions = [];
    Object.keys(us_states).map(k =>
      stateOptions.push({ value: k, label: us_states[k].name })
    );

    switch (this.props.refer.state.selectedDrawOption.value) {
    case 'select':
      return (
        <div>
          <div>
            <br />
              State or region:
            <Select
              value={this.props.refer.state.selectedStateOption}
              onChange={this.handleStateChange}
              options={stateOptions}
              isSearchable={true}
              placeholder="Select state or region"
            />
          </div>
          {this.props.refer.state.selectedStateOption ? (
            <div>
              <br />
                District Type:
              <Select
                value={this.props.refer.state.selectedTypeOption}
                onChange={this.props.refer.handleTypeChange}
                onMenuClose={this.props.refer.selectedTypeFetch}
                options={this.state.typeOptions}
                isSearchable={false}
                placeholder="Select district for this turf"
              />
            </div>
          ) : (
            ''
          )}

          {this.props.refer._showDistrictOption() ? (
            <div>
              <br />
                District Number:
              {this.props.refer.state.districtOptions.length ? (
                <Select
                  value={this.props.refer.state.selectedDistrictOption}
                  onChange={this.props.refer.handleDistrictChange}
                  options={this.props.refer.state.districtOptions}
                  isSearchable={true}
                  placeholder="Select district for this turf"
                />
              ) : (
                <CircularProgress />
              )}
            </div>
          ) : (
            ''
          )}
        </div>
      );
    case 'import':
      return (
        <div>
          <br />
          <input
            type="file"
            accept=".geojson,.json"
            onChange={e => this.props.refer.handleImportFiles(e.target.files)}
          />
        </div>
      );
    case 'radius':
      return (
        <div>
          <br />
            Type the address:
          <PlacesAutocomplete
            debounce={500}
            value={this.props.refer.state.address}
            onChange={this.props.refer.onTypeAddress}
            onSelect={this.props.refer.submitAddress}
          />
        </div>
      );
    case 'draw':
      return (
        <div>
          <br />
            Use a{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://google-developers.appspot.com/maps/documentation/utils/geojson/"
          >
              GeoJSON Draw Tool
          </a>
            , save the file, and then select the "Import GeoJSON shape file"
            option.
        </div>
      );
    default:
      return <div>Unknown generation method.</div>;
    }
  }
}
