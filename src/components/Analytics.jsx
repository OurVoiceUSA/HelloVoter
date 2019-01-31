import React, { Component } from 'react';

import {PieChart, Pie, Cell, Legend, Label} from 'recharts';

import {
  _fetch,
} from '../common.js';

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
      party_breakdown: [],
      animation: true,
    };
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    this.setState({ loading: true });

    let party_breakdown = [];
    let data = await _fetch(this.props.server, '/volunteer/v1/analytics/list');

    if (data && data.data) {
      data.data.map(d => party_breakdown.push({name: d[0], value: d[1]}))
    }

    this.setState({ party_breakdown, loading: false })
  }

  render() {
    return (
      <div>
        <h3>Analytics</h3>
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
      </div>
    );
  }
}
