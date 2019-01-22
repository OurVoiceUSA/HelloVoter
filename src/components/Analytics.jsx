import React, { Component } from 'react';

import {PieChart, Pie, Cell, Legend, Label, LabelList} from 'recharts';

const data01 = [
  { name: 'Republican', value: 400, v: 89, color: 'red' },
  { name: 'Democratic', value: 300, v: 100 },
  { name: 'UUP', value: 200, v: 200 },
  { name: 'Unaffiliated', value: 200, v: 20 },
];

const data02 = [
  { name: 'Republican', value: 2400 },
  { name: 'Democratic', value: 4567 },
  { name: 'UUP', value: 1398 },
  { name: 'Unaffiliated', value: 9800 },
];

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
      animation: true,
    };
  }

  render() {
    return (
      <div>
        <h3>Analytics</h3>
        <PieChart width={800} height={400}>
          <Legend />
          <Pie
            data={data01}
            dataKey="value"
            cx={200}
            cy={200}
            startAngle={180}
            endAngle={0}
            outerRadius={80}
            label
          >
            {
              data01.map((entry, index) => (
                <Cell key={`slice-${index}`} fill={['red','blue','yellow','grey'][index]} />
              ))
            }
            <Label value="Volunteering" position="outside" />
            <LabelList position="outside" />
          </Pie>
          <Pie
            data={data02}
            dataKey="value"
            cx={600}
            cy={200}
            startAngle={180}
            endAngle={-180}
            innerRadius={60}
            outerRadius={80}
            label={renderLabelContent}
            paddingAngle={5}
            isAnimationActive={this.state.animation}
          >
            {
              data02.map((entry, index) => (
                <Cell key={`slice-${index}`} fill={['red','blue','yellow','grey'][index]} />
              ))
            }
            <Label width={50} position="center">
              Agreed with you
            </Label>
          </Pie>
        </PieChart>
      </div>
    );
  }
}
