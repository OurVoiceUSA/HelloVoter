import React, { Component } from 'react';

import Select from 'react-select';
import Checkbox from '@material-ui/core/Checkbox';

import {PieChart, Pie, Cell, Legend, Label} from 'recharts';

import {
  API_BASE_URI,
  _fetch,
  _loadTurfs,
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
      turfOptions: [],
      selectedTurfOption: null,
      party_breakdown: [],
      animation: true,
    };
  }

  componentDidMount() {
    this._init();
  }

  _init = async () => {
    this.setState({ loading: true });

    let turfOptions = [];
    let turfs = await _loadTurfs(this);

    turfs.forEach(t => {
      turfOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTurf key={t.id} turf={t} refer={this} />,
      });
    });

    this.setState({turfOptions}, () => this._loadData());
  }

  _loadData = async () => {
    this.setState({ loading: true });

    let party_breakdown = [];

    let uri = API_BASE_URI+'/analytics/list?turfId=';
    if (this.state.selectedTurfOption && this.state.selectedTurfOption.id) uri += this.state.selectedTurfOption.id;
    if (this.state.include_null) uri += '&include_null=true';

    let data = await _fetch(this.props.server, uri);

    if (data && data.data) {
      data.data.map(d => party_breakdown.push({name: (d[0]?d[0]:'No Data'), value: d[1]}));
    }

    this.setState({ party_breakdown, loading: false });
  }

  handleTurfChange = selectedTurfOption => this.setState({selectedTurfOption}, () => this._loadData());

  render() {
    return (
      <RootLoader flag={this.state.loading} func={() => this._loadData()}>
        <h3>Analytics</h3>
        <Select
          value={this.state.selectedTurfOption}
          onChange={this.handleTurfChange}
          options={this.state.turfOptions}
          isMulti={false}
          isSearchable={true}
          placeholder="Select a turf to include only records within that turf"
        />
        <Checkbox color="primary" checked={this.state.include_null} onChange={(e, c) => {
          this.setState({include_null: c}, async () => await this._loadData());
        }} /> Include records with "No Data"
        {this.state.party_breakdown.length?
        <PieChart width={800} height={400}>
          <Legend />
          <Pie
            data={this.state.party_breakdown}
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
              this.state.party_breakdown.map((entry, index) => (
                <Cell key={`slice-${index}`} fill={['red','blue','yellow','grey'][index]} />
              ))
            }
            <Label width={50} position="center">
              Party Affiliation
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
