import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';

import Modal from '@material-ui/core/Modal';
import List from '@material-ui/core/List';
import Button from '@material-ui/core/Button';

import {
  notify_error,
  _fetch,
  _searchStringify,
  _loadVolunteers,
  RootLoader,
  DialogSaving
} from '../../common.js';

import { CardVolunteer } from './CardVolunteer'

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
TimeAgo.locale(en);

export default class App extends Component {
  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('volunteersperpage');
    if (!perPage) perPage = 5;

    this.state = {
      global: props.global,
      loading: true,
      thisVolunteer: {},
      volunteers: [],
      search: '',
      perPage: perPage,
      pageNum: 1
    };

    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  componentDidMount() {
    this._loadData();
  }

  handlePageNumChange(obj) {
    localStorage.setItem('volunteersperpage', obj.value);
    this.setState({ pageNum: 1, perPage: obj.value });
  }

  onTypeSearch(event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1
    });
  }

  _loadData = async () => {
    const { global } = this.state;

    let volunteers = [];
    this.setState({ loading: true, search: '' });
    try {
      volunteers = await _loadVolunteers(global);
    } catch (e) {
      notify_error(e, 'Unable to load volunteers.');
    }
    this.setState({ loading: false, volunteers });
  };

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  };

  render() {
    const { global } = this.state;

    let ready = [];
    let unassigned = [];
    let denied = [];
    let invited = [];

    this.state.volunteers.forEach(c => {
      if (this.state.search && !_searchStringify(c).includes(this.state.search))
        return;
      if (c.locked) {
        denied.push(c);
      } else if (c.invited) invited.push(c);
      else if (c.ass.ready || c.ass.teams.length) ready.push(c);
      else unassigned.push(c);
    });

    return (
      <RootLoader flag={this.state.loading} func={() => this._loadData()}>
        <Router>
          <div>
            Search:{' '}
            <input
              type="text"
              value={this.state.value}
              onChange={this.onTypeSearch}
              data-tip="Search by name, email, location, or admin"
            />
            <br />
            <Link
              to={'/volunteers/'}
              onClick={() => this.setState({ pageNum: 1 })}
            >
              Volunteers ({ready.length})
            </Link>
            &nbsp;-&nbsp;
            <Link
              to={'/volunteers/unassigned'}
              onClick={() => this.setState({ pageNum: 1 })}
            >
              Unassigned ({unassigned.length})
            </Link>
            &nbsp;-&nbsp;
            <Link
              to={'/volunteers/denied'}
              onClick={() => this.setState({ pageNum: 1 })}
            >
              Denied ({denied.length})
            </Link>
            <Route
              exact={true}
              path="/volunteers/"
              render={() => <ListVolunteers global={global} refer={this} volunteers={ready} />}
            />
            <Route
              exact={true}
              path="/volunteers/unassigned"
              render={() => (
                <ListVolunteers
                  global={global}
                  refer={this}
                  type="Unassigned"
                  volunteers={unassigned}
                />
              )}
            />
            <Route
              exact={true}
              path="/volunteers/invited"
              render={() => (
                <div>
                  <ListVolunteers
                    global={global}
                    refer={this}
                    type="Invited"
                    volunteers={invited}
                  />
                  <Button onClick={async () => {
                    let obj = await _fetch(
                      global,
                      '/volunteer/invite',
                      'POST'
                    );
                    if (obj.token) {
                      this.setState({ thisVolunteer: {id: 'invite:'+obj.token} });
                    } else {
                      notify_error({}, 'Invite failed.');
                    }
                  }} color="primary">
                    Invite Someone
                  </Button>
                </div>
              )}
            />
            <Route
              exact={true}
              path="/volunteers/denied"
              render={() => (
                <ListVolunteers
                  global={global}
                  refer={this}
                  type="Denied"
                  volunteers={denied}
                />
              )}
            />
            <Modal
              aria-labelledby="simple-modal-title"
              aria-describedby="simple-modal-description"
              open={this.state.thisVolunteer.id ? true : false}
              onClose={() => this.setState({ thisVolunteer: {} })}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 100,
                  left: 200,
                  right: 200,
                  backgroundColor: 'white',
                  padding: 40
                }}
              >
                <CardVolunteer
                  global={global}
                  key={this.state.thisVolunteer.id}
                  id={this.state.thisVolunteer.id}
                  edit={true}
                  refer={this}
                />
              </div>
            </Modal>
            <DialogSaving flag={this.state.saving} />
          </div>
        </Router>
      </RootLoader>
    );
  }
}

const ListVolunteers = props => {
  const perPage = props.refer.state.perPage;
  let paginate = <div />;
  let list = [];

  props.volunteers.forEach((c, idx) => {
    let tp = Math.floor(idx / perPage) + 1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardVolunteer global={global} key={c.id} volunteer={c} refer={props.refer} />);
  });

  paginate = (
    <div style={{ display: 'flex' }}>
      <ReactPaginate
        previousLabel={'previous'}
        nextLabel={'next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={props.volunteers.length / perPage}
        marginPagesDisplayed={1}
        pageRangeDisplayed={8}
        onPageChange={props.refer.handlePageClick}
        containerClassName={'pagination'}
        subContainerClassName={'pages pagination'}
        activeClassName={'active'}
      />
      &nbsp;&nbsp;&nbsp;
      <div style={{ width: 75 }}>
        # Per Page{' '}
        <Select
          value={{ value: perPage, label: perPage }}
          onChange={props.refer.handlePageNumChange}
          options={[
            { value: 5, label: 5 },
            { value: 10, label: 10 },
            { value: 25, label: 25 },
            { value: 50, label: 50 },
            { value: 100, label: 100 }
          ]}
        />
      </div>
    </div>
  );

  return (
    <div>
      <h3>
        {props.type}Volunteers ({props.volunteers.length})
      </h3>
      {paginate}
      <List component="nav">{list}</List>
      {paginate}
    </div>
  );
};
