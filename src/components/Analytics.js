import React, { Component } from 'react';

import {PieChart, Pie, Cell, Legend, Label, LabelList} from 'recharts';

const data01 = [
  { name: 'Group A', value: 400, v: 89 },
  { name: 'Group B', value: 300, v: 100 },
  { name: 'Group C', value: 200, v: 200 },
  { name: 'Group D', value: 200, v: 20 },
  { name: 'Group E', value: 278, v: 40 },
  { name: 'Group F', value: 189, v: 60 },
];

const data02 = [
  { name: 'Group A', value: 2400 },
  { name: 'Group B', value: 4567 },
  { name: 'Group C', value: 1398 },
  { name: 'Group D', value: 9800 },
  { name: 'Group E', value: 3908 },
  { name: 'Group F', value: 4800 },
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
                <Cell key={`slice-${index}`} />
              ))
            }
            <Label value="Canvassing" position="outside" />
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
                <Cell key={`slice-${index}`} />
              ))
            }
            <Label width={50} position="center">
              Surveys
            </Label>
          </Pie>
</PieChart>
      </div>
    );
  }
}
