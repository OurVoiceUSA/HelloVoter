import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableFooter from '@material-ui/core/TableFooter';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import Tooltip from '@material-ui/core/Tooltip';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import FirstPageIcon from '@material-ui/icons/FirstPage';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import LastPageIcon from '@material-ui/icons/LastPage';
import formatNumber from 'simple-format-number';
import prettyMs from 'pretty-ms';

import {
  _fetch, RootLoader,
} from '../common.js';

const actionsStyles = theme => ({
  root: {
    flexShrink: 0,
    color: theme.palette.text.secondary,
    marginLeft: theme.spacing.unit * 2.5,
  },
});

const jobRuntime = (start, end) => {
  if (end)
    return prettyMs(end-start);
  else
    return "";
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

class TablePaginationActions extends Component {
  handleFirstPageButtonClick = event => {
    this.props.onChangePage(event, 0);
  };

  handleBackButtonClick = event => {
    this.props.onChangePage(event, this.props.page - 1);
  };

  handleNextButtonClick = event => {
    this.props.onChangePage(event, this.props.page + 1);
  };

  handleLastPageButtonClick = event => {
    this.props.onChangePage(
      event,
      Math.max(0, Math.ceil(this.props.count / this.props.rowsPerPage) - 1),
    );
  };

  render() {
    const { classes, count, page, rowsPerPage, theme } = this.props;

    return (
      <div className={classes.root}>
        <IconButton
          onClick={this.handleFirstPageButtonClick}
          disabled={page === 0}
          aria-label="First Page"
        >
          {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
        </IconButton>
        <IconButton
          onClick={this.handleBackButtonClick}
          disabled={page === 0}
          aria-label="Previous Page"
        >
          {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
        </IconButton>
        <IconButton
          onClick={this.handleNextButtonClick}
          disabled={page >= Math.ceil(count / rowsPerPage) - 1}
          aria-label="Next Page"
        >
          {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
        </IconButton>
        <IconButton
          onClick={this.handleLastPageButtonClick}
          disabled={page >= Math.ceil(count / rowsPerPage) - 1}
          aria-label="Last Page"
        >
          {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
        </IconButton>
      </div>
    );
  }
}

TablePaginationActions.propTypes = {
  classes: PropTypes.object.isRequired,
  count: PropTypes.number.isRequired,
  onChangePage: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  theme: PropTypes.object.isRequired,
};

const TablePaginationActionsWrapped = withStyles(actionsStyles, { withTheme: true })(
  TablePaginationActions,
);

const styles = theme => ({
  root: {
    width: '100%',
    marginTop: theme.spacing.unit * 3,
  },
  table: {
    minWidth: 500,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
});

class Queue extends Component {

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
      <Paper className={classes.root}>
        <RootLoader className={classes.tableWrapper} flag={this.state.loading} func={() => this._loadData()}>
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                <Tooltip title="The date/time that this job entered the queue.">
                  <TableCell>Enqueu Time</TableCell>
                </Tooltip>
                <Tooltip title="The operation that this queue manages.">
                  <TableCell align="right">Task</TableCell>
                </Tooltip>
                <Tooltip title="The time this task had to wait in queue for other jobs to finish.">
                  <TableCell align="right">Queue Delay</TableCell>
                </Tooltip>
                <Tooltip title="The time it took for this task to complete.">
                  <TableCell align="right">Runtime</TableCell>
                </Tooltip>
                <Tooltip title="The status of this job.">
                  <TableCell align="right">Status</TableCell>
                </Tooltip>
                <Tooltip title="The particular item that queued task was processing.">
                  <TableCell align="right">Task Reference</TableCell>
                </Tooltip>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                <TableRow key={row.id}>
                  <TableCell component="th" scope="row">
                    {new Date(row.created).toString()}
                  </TableCell>
                  <TableCell align="right">{row.task}</TableCell>
                  <TableCell align="right">{jobRuntime(row.created, row.started)}</TableCell>
                  <TableCell align="right">{jobRuntime(row.started, row.completed)}</TableCell>
                  <TableCell align="right">{jobStatus(row)}</TableCell>
                  <TableCell align="right">{taskObjFromQueue(row.type, row.obj)}</TableCell>
                </TableRow>
              ))}
              {emptyRows > 0 && (
                <TableRow style={{ height: 48 * emptyRows }}>
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  colSpan={3}
                  count={rows.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  SelectProps={{
                    native: true,
                  }}
                  onChangePage={this.handleChangePage}
                  onChangeRowsPerPage={this.handleChangeRowsPerPage}
                  ActionsComponent={TablePaginationActionsWrapped}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </RootLoader>
      </Paper>
    );
  }
}

Queue.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Queue);
