import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import ReactPaginate from 'react-paginate';
import ReactTooltip from 'react-tooltip';
import Select from 'react-select';

import Modal from '@material-ui/core/Modal';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Avatar from '@material-ui/core/Avatar';

import {
  API_BASE_URI,
  notify_error,
  notify_success,
  _fetch,
  _searchStringify,
  _handleSelectChange,
  _loadVolunteers,
  _loadVolunteer,
  _loadTeams,
  _loadForms,
  _loadTurfs,
  RootLoader,
  Icon,
  PlacesAutocomplete,
  DialogSaving
} from '../common.js';

import { CardTurf } from './Turf';
import { CardForm } from './Forms';
import { CardTeam } from './Teams';

import {
  faCrown,
  faExclamationTriangle,
  faCheckCircle,
  faBan,
  faHome,
  faFlag
} from '@fortawesome/free-solid-svg-icons';

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
TimeAgo.locale(en);

export default class Volunteers extends Component {
  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('volunteersperpage');
    if (!perPage) perPage = 5;

    this.state = {
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
    let volunteers = [];
    this.setState({ loading: true, search: '' });
    try {
      volunteers = await _loadVolunteers(this);
    } catch (e) {
      notify_error(e, 'Unable to load volunteers.');
    }
    this.setState({ loading: false, volunteers });
  };

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  };

  render() {
    let ready = [];
    let unassigned = [];
    let denied = [];

    this.state.volunteers.forEach(c => {
      if (this.state.search && !_searchStringify(c).includes(this.state.search))
        return;
      if (c.locked) {
        denied.push(c);
      } else {
        if (c.ass.ready || c.ass.teams.length) ready.push(c);
        else unassigned.push(c);
      }
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
              render={() => <ListVolunteers refer={this} volunteers={ready} />}
            />
            <Route
              exact={true}
              path="/volunteers/unassigned"
              render={() => (
                <ListVolunteers
                  refer={this}
                  type="Unassigned"
                  volunteers={unassigned}
                />
              )}
            />
            <Route
              exact={true}
              path="/volunteers/denied"
              render={() => (
                <ListVolunteers
                  refer={this}
                  type="Denied"
                  volunteers={denied}
                />
              )}
            />
            <Route
              path="/volunteers/view/:id"
              render={props => (
                <CardVolunteer
                  key={props.match.params.id}
                  id={props.match.params.id}
                  edit={true}
                  refer={this}
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
    list.push(<CardVolunteer key={c.id} volunteer={c} refer={props.refer} />);
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

export class CardVolunteer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      server: this.props.refer.props.server,
      volunteer: this.props.volunteer,
      selectedTeamsOption: [],
      selectedLeaderOption: [],
      selectedFormsOption: [],
      selectedTurfOption: [],
    };
  }

  componentDidMount() {
    if (!this.state.volunteer) this._loadData();

    ReactTooltip.rebuild();
  }

  componentDidUpdate() {
    ReactTooltip.rebuild();
  }

  handleTeamsChange = async selectedTeamsOption => {
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedTeamsOption,
        selectedTeamsOption
      );

      for (let i in obj.add) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/team/members/add',
          'POST',
          { teamId: obj.add[i], cId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/team/members/remove',
          'POST',
          { teamId: obj.rm[i], cId: this.props.id }
        );
      }

      // refresh volunteer info
      let volunteer = await _loadVolunteer(this, this.props.id);
      notify_success('Team assignments saved.');
      this.setState({
        selectedTeamsOption,
        selectedFormsOption: [],
        selectedTurfOption: [],
        volunteer
      });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleLeaderChange = async selectedLeaderOption => {
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedLeaderOption,
        selectedLeaderOption
      );

      for (let i in obj.add) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/team/members/promote',
          'POST',
          { teamId: obj.add[i], cId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/team/members/demote',
          'POST',
          { teamId: obj.rm[i], cId: this.props.id }
        );
      }

      // refresh volunteer info
      let volunteer = await _loadVolunteer(this, this.props.id);
      notify_success('Team leaders saved.');
      this.setState({ selectedLeaderOption, volunteer });
    } catch (e) {
      notify_error(e, 'Unable to edit team leadership.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleFormsChange = async selectedFormsOption => {
    this.props.refer.setState({ saving: true });
    try {
      if (this.state.selectedFormsOption.value) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/form/assigned/volunteer/remove',
          'POST',
          {
            formId: this.state.selectedFormsOption.id,
            cId: this.props.id
          }
        );
      }
      if (selectedFormsOption.value) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/form/assigned/volunteer/add',
          'POST',
          {
            formId: selectedFormsOption.id,
            cId: this.props.id
          }
        );
      }
      // refresh volunteer info
      let volunteer = await _loadVolunteer(this, this.props.id);
      notify_success('Form selection saved.');
      this.setState({ volunteer, selectedFormsOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove form.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleTurfChange = async selectedTurfOption => {
    this.props.refer.setState({ saving: true });
    try {
      if (this.state.selectedTurfOption.value) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/turf/assigned/volunteer/remove',
          'POST',
          {
            turfId: this.state.selectedTurfOption.id,
            cId: this.props.id
          }
        );
      }
      if (selectedTurfOption.value) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/turf/assigned/volunteer/add',
          'POST',
          {
            turfId: selectedTurfOption.id,
            cId: this.props.id
          }
        );
      }
      // refresh volunteer info
      let volunteer = await _loadVolunteer(this, this.props.id);
      notify_success('Turf selection saved.');
      this.setState({ volunteer, selectedTurfOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove turf.');
    }
    this.props.refer.setState({ saving: false });
  };

  _loadData = async () => {
    let volunteer = {},
      forms = [],
      turf = [],
      teams = [];

    this.setState({ loading: true });

    try {
      [volunteer, forms, turf, teams] = await Promise.all([
        _loadVolunteer(this, this.props.id),
        _loadForms(this.props.refer),
        _loadTurfs(this.props.refer),
        _loadTeams(this.props.refer)
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load canavasser info.');
      return this.setState({ loading: false });
    }

    let teamOptions = [];
    let leaderOptions = [];
    let selectedTeamsOption = [];
    let selectedLeaderOption = [];
    let selectedFormsOption = [];
    let selectedTurfOption = [];

    let formOptions = [{ value: '', label: 'None' }];

    let turfOptions = [
      { value: '', label: 'None' },
      {
        value: 'auto',
        id: 'auto',
        label: (
          <CardTurf
            key="auto"
            turf={{
              id: 'auto',
              name: 'Area surrounnding this volunteer\'s home address'
            }}
            refer={this}
            icon={faHome}
          />
        )
      }
    ];

    teams.forEach(t => {
      teamOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam key={t.id} team={t} refer={this} />
      });
      volunteer.ass.teams.forEach((a, idx) => {
        if (a.id === t.id) {
          selectedTeamsOption.push({
            value: _searchStringify(t),
            id: t.id,
            label: <CardTeam key={t.id} team={t} refer={this} />
          });
          leaderOptions.push({
            value: _searchStringify(t),
            id: t.id,
            label: <CardTeam key={t.id} team={t} refer={this} />
          });
          if (a.leader) {
            selectedLeaderOption.push({
              value: _searchStringify(t),
              id: t.id,
              label: <CardTeam key={t.id} team={t} refer={this} />
            });
          }
        }
      });
    });

    forms.forEach(f => {
      formOptions.push({
        value: _searchStringify(f),
        id: f.id,
        label: <CardForm key={f.id} form={f} refer={this} />
      });
    });

    if (volunteer.ass.forms.length) {
      let f = volunteer.ass.forms[0];
      selectedFormsOption = [
        {
          value: _searchStringify(f),
          id: f.id,
          label: <CardForm key={f.id} form={f} refer={this} />
        },
      ];
    }

    turf.forEach(t => {
      turfOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTurf key={t.id} turf={t} refer={this} />
      });
    });

    if (volunteer.ass.turfs.length) {
      let t = volunteer.ass.turfs[0];
      selectedTurfOption = [
        {
          value: _searchStringify(t),
          id: t.id,
          label: (
            <CardTurf
              key={t.id}
              turf={t}
              refer={this}
              icon={volunteer.autoturf ? faHome : null}
            />
          )
        },
      ];
    }

    this.setState({
      loading: false,
      volunteer,
      teamOptions,
      leaderOptions,
      formOptions,
      turfOptions,
      selectedTeamsOption,
      selectedLeaderOption,
      selectedFormsOption,
      selectedTurfOption
    });
  };

  _lockVolunteer = async (volunteer, flag) => {
    let term = flag ? 'lock' : 'unlock';
    this.props.refer.setState({ saving: true });
    try {
      await _fetch(
        this.state.server,
        API_BASE_URI+'/volunteer/' + term,
        'POST',
        { id: volunteer.id }
      );
      notify_success('Volunteer hass been ' + term + 'ed.');
    } catch (e) {
      notify_error(e, 'Unable to ' + term + ' volunteer.');
    }
    this.props.refer.setState({ saving: false });

    this._loadData();
  };

  render() {
    const { volunteer } = this.state;

    if (!volunteer || this.state.loading) {
      return <CircularProgress />;
    }

    if (this.props.edit)
      return (
        <div>
          <ListItem alignItems="flex-start" style={{ width: 350 }}>
            <ListItemAvatar>
              <Avatar alt={volunteer.name} src={volunteer.avatar} />
            </ListItemAvatar>
            <ListItemText
              primary={volunteer.name}
              secondary={
                volunteer.homeaddress
                  ? extract_addr(volunteer.homeaddress)
                  : 'N/A'
              }
            />
            <VolunteerBadges volunteer={volunteer} />
          </ListItem>
          <CardVolunteerFull volunteer={volunteer} refer={this} />
        </div>
      );

    return (
      <ListItem
        button
        style={{ width: 350 }}
        alignItems="flex-start"
        onClick={() => this.props.refer.setState({ thisVolunteer: volunteer })}
      >
        <ListItemAvatar>
          <Avatar alt={volunteer.name} src={volunteer.avatar} />
        </ListItemAvatar>
        <ListItemText
          primary={volunteer.name}
          secondary={
            volunteer.homeaddress ? extract_addr(volunteer.homeaddress) : 'N/A'
          }
        />
        <VolunteerBadges volunteer={volunteer} />
      </ListItem>
    );
  }
}

export const CardVolunteerFull = props => (
  <div>
    <br />
    {props.volunteer.locked ? (
      <button
        onClick={() => props.refer._lockVolunteer(props.volunteer, false)}
      >
        Restore Access
      </button>
    ) : (
      <button onClick={() => props.refer._lockVolunteer(props.volunteer, true)}>
        Deny Access
      </button>
    )}
    <br />
    Last Seen:{' '}
    {new TimeAgo('en-US').format(new Date(props.volunteer.last_seen - 30000))}
    <br />
    Email: {props.volunteer.email ? props.volunteer.email : 'N/A'}
    <br />
    Phone: {props.volunteer.phone ? props.volunteer.phone : 'N/A'}
    <br />
    Address:{' '}
    <VolunteerAddress refer={props.refer} volunteer={props.volunteer} />
    <br />
    # of doors knocked: 0
    <br />
    <br />
    <div>
      Teams this volunteer is a member of:
      <Select
        value={props.refer.state.selectedTeamsOption}
        onChange={props.refer.handleTeamsChange}
        options={props.refer.state.teamOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Teams this volunteer is a leader of:
      <Select
        value={props.refer.state.selectedLeaderOption}
        onChange={props.refer.handleLeaderChange}
        options={props.refer.state.selectedTeamsOption}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>

    <br />
    {props.refer.state.selectedTeamsOption.length ? (
      <div>
        Forms / Turf this users sees based on the above team(s):
        <br />
        {props.volunteer.ass.forms.map(f => (
          <CardForm key={f.id} form={f} refer={props.refer} />
        ))}
        {props.volunteer.ass.turfs.map(t => (
          <CardTurf key={t.id} turf={t} refer={props.refer} />
        ))}
      </div>
    ):''
    }
    <div>
      Forms this volunteer is directly assigned to:
      <Select
        value={props.refer.state.selectedFormsOption}
        onChange={props.refer.handleFormsChange}
        options={props.refer.state.formOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Turf this volunteer is directly assigned to:
      <Select
        value={props.refer.state.selectedTurfOption}
        onChange={props.refer.handleTurfChange}
        options={props.refer.state.turfOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
  </div>
);

export class VolunteerAddress extends Component {
  constructor(props) {
    super(props);
    this.state = {
      edit: false,
      address: this.props.volunteer.homeaddress
        ? this.props.volunteer.homeaddress
        : ''
    };
    this.onTypeAddress = address => this.setState({ address });
  }

  submitAddress = async address => {
    this.setState({ address });
    try {
      let res = await geocodeByAddress(address);
      let pos = await getLatLng(res[0]);
      await _fetch(
        this.props.refer.state.server,
        API_BASE_URI+'/volunteer/update',
        'POST',
        {
          id: this.props.volunteer.id,
          address: address,
          lat: pos.lat,
          lng: pos.lng
        }
      );
      this.props.refer._loadData();
      notify_success('Address hass been saved.');
    } catch (e) {
      notify_error(e, 'Unable to update address info.');
    }
  };

  render() {
    if (this.state.edit)
      return (
        <PlacesAutocomplete
          debounce={500}
          value={this.state.address}
          onChange={this.onTypeAddress}
          onSelect={this.submitAddress}
        />
      );

    return (
      <div>
        {this.state.address}{' '}
        <button onClick={() => this.setState({ edit: true })}>
          click to edit
        </button>
      </div>
    );
  }
}

export const VolunteerBadges = props => {
  let badges = [];
  let id = props.volunteer.id;

  if (props.volunteer.admin)
    badges.push(
      <Icon
        icon={faCrown}
        color="gold"
        key={id + 'admin'}
        data-tip="Administrator"
      />
    );
  if (props.volunteer.ass.leader)
    badges.push(
      <Icon
        icon={faFlag}
        color="green"
        key={id + 'leader'}
        data-tip="Team Leader"
      />
    );
  if (props.volunteer.locked)
    badges.push(
      <Icon
        icon={faBan}
        color="red"
        key={id + 'locked'}
        data-tip="Denied access"
      />
    );
  else {
    if (props.volunteer.ass.ready)
      badges.push(
        <Icon
          icon={faCheckCircle}
          color="green"
          key={id + 'ready'}
          data-tip="Ready to Canvass"
        />
      );
    else
      badges.push(
        <Icon
          icon={faExclamationTriangle}
          color="red"
          key={id + 'notready'}
          data-tip="Not ready to volunteer, check assignments"
        />
      );
    if (!props.volunteer.homeaddress)
      badges.push(
        <Icon
          icon={faHome}
          color="red"
          key={id + 'addr'}
          data-tip="Home Address is not set"
        />
      );
  }

  return badges;
};

function extract_addr(addr) {
  let arr = addr.split(', ');
  if (arr.length < 4) return addr;
  arr.shift();
  return arr.join(', ');
}
