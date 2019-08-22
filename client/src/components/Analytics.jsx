import React, { Component } from 'react';

import Select from 'react-select';
import Checkbox from '@material-ui/core/Checkbox';

import {PieChart, Pie, Cell, Legend, Label} from 'recharts';

import {
  _fetch,
  _loadTurfs,
  _loadAttributes,
  _searchStringify,
  RootLoader,
} from '../common.js';

import { CardTurf } from './Turf';

const renderLabelContent = (props) => {
  const { value, percent, x, y, midAngle } = props;

  return (
    <g transform={`translate(${x}, ${y})`} textAnchor={ (midAngle < -90 || midAngle >= 90) ? 'end' : 'start'}>
      <text x={0} y={0}>{`Count: ${value}`}</text>
      <text x={0} y={20}>{`(Percent: ${(percent * 100).toFixed(2)}%)`}</text>
    </g>
  );
};

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      global: props.global,
      turfOptions: [],
      selectedTurfOption: null,
      data_breakdown: [],
      animation: true,
    };
  }

  componentDidMount() {
    this._init();
  }

  _init = async () => {
    const { global } = this.state;

    this.setState({ loading: true });

    let turfOptions = [];
    let turfs = await _loadTurfs(global);
    let attributeOptions = [];
    let attributes = await _loadAttributes(global);

    turfs.forEach(t => {
      turfOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTurf global={global} key={t.id} turf={t} refer={this} />,
      });
    });

    attributes.forEach(a => {
      attributeOptions.push({
        value: _searchStringify(a),
        id: a.id,
        label: a.name,
      });
    });

    this.setState({loading: false, attributeOptions, turfOptions});
  }

  doQuery = async () => {
    const { global } = this.state;

    if (!this.state.selectedAttributeOption) return;

    this.setState({ loading: true });

    let data_breakdown = [];

    let uri = '/analytics/list?turfId=';
    if (this.state.selectedTurfOption && this.state.selectedTurfOption.id) uri += this.state.selectedTurfOption.id;
    if (this.state.selectedAttributeOption && this.state.selectedAttributeOption.id) uri += '&aId='+this.state.selectedAttributeOption.id;
    if (this.state.include_null) uri += '&include_null=true';

    let data = await _fetch(global, uri);

    if (data && data.data) {
      data.data.map(d => data_breakdown.push({name: (d[0]?d[0]:'No Data'), value: d[1]}));
    }

    // if data has more than 6 elements, combine everything after 6 into the 6th and mark it "other"
    while (data_breakdown.length > 6) {
      data_breakdown[5] = {name: "Other", value: data_breakdown[5].value+data_breakdown.pop().value};
    }

    this.setState({ data_breakdown, loading: false });
  }

  handleTurfChange = selectedTurfOption => {
    if (!selectedTurfOption) selectedTurfOption = [];
    this.setState({selectedTurfOption}, () => this.doQuery());
  }

  handleAttributeChange = selectedAttributeOption => {
    if (!selectedAttributeOption) selectedAttributeOption = [];
    this.setState({selectedAttributeOption}, () => this.doQuery());
  }

  render() {
    return (
      <RootLoader flag={this.state.loading} func={() => this.doQuery()}>
        <h3>Analytics</h3>
        <Select
          value={this.state.selectedAttributeOption}
          onChange={this.handleAttributeChange}
          options={this.state.attributeOptions}
          isMulti={false}
          isSearchable={true}
          placeholder="Select an attribute to query data for"
        />
        <br />
        <Select
          value={this.state.selectedTurfOption}
          onChange={this.handleTurfChange}
          options={this.state.turfOptions}
          isMulti={false}
          isSearchable={true}
          placeholder="Select a turf to include only records within that turf"
        />
        <Checkbox color="primary" checked={this.state.include_null} onChange={(e, c) => {
          this.setState({include_null: c}, async () => await this.doQuery());
        }} /> Include records with "No Data"
        {this.state.data_breakdown.length?
        <PieChart width={800} height={400}>
          <Legend />
          <Pie
            data={this.state.data_breakdown}
            dataKey="value"
            startAngle={180}
            endAngle={-180}
            innerRadius={60}
            outerRadius={80}
            label={renderLabelContent}
            paddingAngle={5}
            isAnimationActive={this.state.animation}
          >
            {
              this.state.data_breakdown.map((entry, index) => (
                <Cell key={`slice-${index}`} fill={['red','blue','yellow','green','grey'][index]} />
              ))
            }
            <Label width={50} position="center">
              {this.state.selectedAttributeOption.label}
            </Label>
          </Pie>
        </PieChart>
        :
        <h3>No Data</h3>
        }
      </RootLoader>
    );
  }
}
