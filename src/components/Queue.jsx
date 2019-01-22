import React, { Component } from 'react';
import { PaperTable } from './elements';

import {
  _fetch,
  jobRuntime,
  RootLoader,
} from '../common.js';

const tsToStr = (ts) => {
  return new Date(ts).toString()
}

const jobStatus = (job) => {
  if (typeof job.success === "boolean") {
    if (job.success) return "successful";
    else return "failed";
  } else {
    if (job.started) return "running";
    else return "waiting";
  }
}

const taskObjFromQueue = (type, obj) => {
  switch (type) {
    case "ImportFile": return "Import file "+obj.filename;
    case "Turf": return "Turf "+obj.name;
    default: return "Unknown";
  }
}

export default class Queue extends Component {

  constructor(props) {
    super(props);

    this.state = {
      rows: [],
      page: 0,
      rowsPerPage: 5,
      server: this.props.server,
    };
  }

  handleChangePage = (event, page) => {
    this.setState({ page });
  };

  handleChangeRowsPerPage = event => {
    this.setState({ rowsPerPage: event.target.value });
  };

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    let rows = [];

    this.setState({loading: true});

    let obj = await _fetch(
      this.state.server,
      '/volunteer/v1/queue/list',
    );
    if (obj.data) {
      rows = obj.data.map(r => {
        let q = r[0];
        q.type = r[1];
        q.obj = r[2];
        return q;
      });
    }
    this.setState({rows, loading: false});
  }

  render() {
    const { classes } = this.props;
    const { rows, rowsPerPage, page } = this.state;
    const emptyRows = rowsPerPage - Math.min(rowsPerPage, rows.length - page * rowsPerPage);

    return (
      <RootLoader flag={this.state.loading} func={() => this._loadData()}>
        <PaperTable
          spec={[
            {
              header: "Enqueu Time",
              tooltip: "The date/time that this job entered the queue.",
              func: tsToStr,
              params: ['created'],
            },
            {
              header: "Task",
              tooltip: "The operation that this queue manages.",
              params: ['task'],
            },
            {
              header: "Queue Delay",
              tooltip: "The time this task had to wait in queue for other jobs to finish.",
              func: jobRuntime,
              params: ['created', 'started'],
            },
            {
              header: "Runtime",
              tooltip: "The time it took for this task to complete.",
              func: jobRuntime,
              params: ['started', 'completed'],
            },
            {
              header: "Status",
              tooltip: "The status of this particular task.",
              func: jobStatus,
            },
            {
              header: "Task Reference",
              tooltip: "The particular item that queued task was processing.",
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
