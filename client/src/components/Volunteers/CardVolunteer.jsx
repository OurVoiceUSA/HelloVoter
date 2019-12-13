import React, { Component } from 'react';

import ReactTooltip from 'react-tooltip';

import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Avatar from '@material-ui/core/Avatar';

import {
  notify_error,
  notify_success,
  _fetch,
  _searchStringify,
  _handleSelectChange,
  _loadVolunteer,
  _loadTeams,
  _loadForms,
  _loadTurfs,
  _loadNearbyTurfs,
  Icon,
} from '../../common.js';

import { CardTurf } from '../Turf';
import { CardForm } from '../Forms';
import { CardTeam } from '../Teams';
import { CardVolunteerFull } from './CardVolunteerFull';

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

const NEARBY_DIST = 50;

function extract_addr(addr) {
  let arr = addr.split(', ');
  if (arr.length < 4) return addr;
  arr.shift();
  return arr.join(', ');
}

export class CardVolunteer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      global: props.global,
      refer: this.props.refer.props.refer,
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
    const { global } = this.state;

    if (!selectedTeamsOption) selectedTeamsOption = [];
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedTeamsOption,
        selectedTeamsOption
      );

      let adrm = [];

      obj.add.forEach(add => {
        adrm.push(_fetch(
          global,
          '/team/members/add',
          'POST',
          { teamId: add, vId: this.props.id }
        ));
      });

      obj.rm.forEach(rm => {
        adrm.push(_fetch(
          global,
          '/team/members/remove',
          'POST',
          { teamId: rm, vId: this.props.id }
        ));
      });

      await Promise.all(adrm);

      // refresh volunteer info
      let volunteer = await _loadVolunteer(global, this.props.id);
      notify_success('Team assignments saved.');
      this.setState({
        selectedTeamsOption,
        volunteer
      });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleLeaderChange = async selectedLeaderOption => {
    const { global } = this.state;

    if (!selectedLeaderOption) selectedLeaderOption = [];
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedLeaderOption,
        selectedLeaderOption
      );

      let adrm = [];

      obj.add.forEach(add => {
        adrm.push(_fetch(
          global,
          '/team/members/promote',
          'POST',
          { teamId: add, vId: this.props.id }
        ));
      });

      obj.rm.forEach(rm => {
        adrm.push(_fetch(
          global,
          '/team/members/demote',
          'POST',
          { teamId: rm, vId: this.props.id }
        ));
      });

      await Promise.all(adrm);

      // refresh volunteer info
      let volunteer = await _loadVolunteer(global, this.props.id);
      notify_success('Team leaders saved.');
      this.setState({ selectedLeaderOption, volunteer });
    } catch (e) {
      notify_error(e, 'Unable to edit team leadership.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleFormsChange = async selectedFormsOption => {
    const { global } = this.state;

    if (!selectedFormsOption) selectedFormsOption = [];
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedFormsOption,
        selectedFormsOption
      );

      let adrm = [];

      obj.add.forEach(add => {
        adrm.push(_fetch(
          global,
          '/form/assigned/volunteer/add',
          'POST',
          { formId: add, vId: this.props.id }
        ));
      })

      obj.rm.forEach(rm => {
        adrm.push(_fetch(
          global,
          '/form/assigned/volunteer/remove',
          'POST',
          { formId: rm, vId: this.props.id }
        ));
      });

      await Promise.all(adrm);

      // refresh volunteer info
      let volunteer = await _loadVolunteer(global, this.props.id);
      notify_success('Form selection saved.');
      this.setState({ selectedFormsOption, volunteer });
    } catch (e) {
      notify_error(e, 'Unable to add/remove form.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleTurfChange = async selectedTurfOption => {
    const { global } = this.state;

    if (!selectedTurfOption) selectedTurfOption = [];
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedTurfOption,
        selectedTurfOption
      );

      let adrm = [];

      obj.add.forEach(add => {
        adrm.push(_fetch(
          global,
          '/turf/assigned/volunteer/add',
          'POST',
          { turfId: add, vId: this.props.id }
        ));
      })

      obj.rm.forEach(rm => {
        adrm.push(_fetch(
          global,
          '/turf/assigned/volunteer/remove',
          'POST',
          { turfId: rm, vId: this.props.id }
        ));
      })

      await Promise.all(adrm);

      // refresh volunteer info
      let volunteer = await _loadVolunteer(global, this.props.id);
      notify_success('Turf selection saved.');
      this.setState({ selectedTurfOption, volunteer });
    } catch (e) {
      notify_error(e, 'Unable to add/remove turf.');
    }
    this.props.refer.setState({ saving: false });
  };

  _loadData = async () => {
    const { global } = this.state;

    let volunteer = {},
      forms = [],
      turf = [],
      teams = [],
      hometurf = [],
      nearbyturf = [];

    this.setState({ loading: true });

    try {
      [volunteer, forms, turf, teams] = await Promise.all([
        _loadVolunteer(global, this.props.id),
        _loadForms(global),
        _loadTurfs(global),
        _loadTeams(global),
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load canavasser info.');
      return this.setState({ loading: false });
    }

    if (volunteer.location) {
      hometurf = await _loadNearbyTurfs(global, volunteer.location.x, volunteer.location.y, 0);
      nearbyturf = await _loadNearbyTurfs(global, volunteer.location.x, volunteer.location.y, NEARBY_DIST);
    }

    let teamOptions = [];
    let leaderOptions = [];
    let selectedTeamsOption = [];
    let selectedLeaderOption = [];
    let selectedFormsOption = [];
    let selectedTurfOption = [];

    let formOptions = [{ value: '', label: 'None' }];

    let turfOptions = [
      { value: '', label: 'None' }
    ];

    teams.forEach(t => {
      teamOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam global={global} key={t.id} team={t} refer={this} />
      });
      volunteer.ass.teams.forEach((a, idx) => {
        if (a.id === t.id) {
          selectedTeamsOption.push({
            value: _searchStringify(t),
            id: t.id,
            label: <CardTeam global={global} key={t.id} team={t} refer={this} />
          });
          leaderOptions.push({
            value: _searchStringify(t),
            id: t.id,
            label: <CardTeam global={global} key={t.id} team={t} refer={this} />
          });
          if (a.leader) {
            selectedLeaderOption.push({
              value: _searchStringify(t),
              id: t.id,
              label: <CardTeam global={global} key={t.id} team={t} refer={this} />
            });
          }
        }
      });
    });

    forms.forEach(f => {
      formOptions.push({
        value: _searchStringify(f),
        id: f.id,
        label: <CardForm global={global} key={f.id} form={f} refer={this} />
      });
    });

    volunteer.ass.forms.forEach(f => {
      if (f.direct) {
        selectedFormsOption.push({
          value: _searchStringify(f),
          id: f.id,
          label: <CardForm global={global} key={f.id} form={f} refer={this} />
        });
      }
    });

    turf.forEach(t => {
      turfOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTurf global={global} key={t.id} turf={t} refer={this} />
      });
    });

    volunteer.ass.turfs.forEach(t => {
      if (t.direct) {
        selectedTurfOption.push({
          value: _searchStringify(t),
          id: t.id,
          label: (
            <CardTurf
              global={global}
              key={t.id}
              turf={t}
              refer={this}
              icon={volunteer.autoturf ? faHome : null}
            />
          )
        });
      }
    });

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
      selectedTurfOption,
      hometurf,
      nearbyturf,
    });
  };

  _lockVolunteer = async (volunteer, flag) => {
    const { global } = this.state;

    let term = flag ? 'lock' : 'unlock';
    this.props.refer.setState({ saving: true });
    try {
      await _fetch(
        global,
        '/volunteer/' + term,
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
    const { global, volunteer } = this.state;

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
                volunteer.locationstr
                  ? extract_addr(volunteer.locationstr)
                  : 'N/A'
              }
            />
            <VolunteerBadges volunteer={volunteer} />
          </ListItem>
          <CardVolunteerFull global={global} volunteer={volunteer} refer={this} />
        </div>
      );

    return (
      <ListItem
        button
        style={{ width: 350 }}
        alignItems="flex-start"
        onClick={() => {
          this.props.refer.setState({ thisVolunteer: volunteer });
          window.location.href = "/HelloVoterHQ/#/volunteers/view/"+volunteer.id;
        }}>
        <ListItemAvatar>
          <Avatar alt={volunteer.name} src={volunteer.avatar} />
        </ListItemAvatar>
        <ListItemText
          primary={volunteer.name}
          secondary={
            volunteer.locationstr ? extract_addr(volunteer.locationstr) : 'N/A'
          }
        />
        <VolunteerBadges volunteer={volunteer} />
      </ListItem>
    );
  }
}

const VolunteerBadges = props => {
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
          data-tip="Ready to Canvas"
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
    if (!props.volunteer.locationstr)
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
