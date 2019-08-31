import React, { Component } from 'react';
import { PaperTable } from './Elements';

import {
  _fetch,
  tsToStr,
  jobRuntime,
  RootLoader
} from '../common.js';

const jobStatus = job => {
  if (typeof job.success === 'boolean') {
    if (job.success) return 'successful';
    else return 'failed';
  } else {
    if (job.started) return 'running';
    else return 'waiting';
  }
};

const showErrorIfError = job => {
  if (job.error) return job.error;
  else return null;
};

const taskObjFromQueue = (type, obj) => {
  switch (type) {
    case 'ImportFile':
      return 'Import file ' + obj.filename;
    case 'Turf':
      return 'Turf ' + obj.name;
    default:
      return 'Unknown';
  }
};

export default class Queue extends Component {
  constructor(props) {
    super(props);

    this.state = {
      rows: [],
      global: props.global,
    };
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    const { global } = this.state;

    let rows = [];

    this.setState({ loading: true });

    let obj = await _fetch(global, '/queue/list');
    if (obj.data) {
      rows = obj.data.map(r => {
        let q = r[0];
        q.type = r[1];
        q.obj = r[2];
        return q;
      });
    }
    this.setState({ rows, loading: false });
  };

  render() {
    const { rows } = this.state;

    return (
      <RootLoader flag={this.state.loading} func={() => this._loadData()}>
        <PaperTable
          spec={[
            {
              header: 'Enqueu Time',
              tooltip: 'The date/time that this job entered the queue.',
              func: tsToStr,
              params: ['created'],
            },
            {
              header: 'Task',
              tooltip: 'The operation that this queue manages.',
              params: ['task'],
            },
            {
              header: 'Queue Delay',
              tooltip:
                'The time this task had to wait in queue for other jobs to finish.',
              func: jobRuntime,
              params: ['created', 'started'],
            },
            {
              header: 'Runtime',
              tooltip: 'The time it took for this task to complete.',
              func: jobRuntime,
              params: ['started', 'completed'],
            },
            {
              header: 'Status',
              tooltip: 'The status of this particular task.',
              func: jobStatus,
              funcItemTooltip: showErrorIfError,
            },
            {
              header: 'Task Reference',
              tooltip: 'The particular item that queued task was processing.',
              func: taskObjFromQueue,
              params: ['type', 'obj'],
            },
          ]}
          rows={rows}
        />
      </RootLoader>
    );
  }
}
