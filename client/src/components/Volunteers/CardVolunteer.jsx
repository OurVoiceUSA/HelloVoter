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
  _loadForms,
  _loadTurfs,
  _loadNearbyTurfs,
  Icon,
} from '../../common.js';

import { CardTurf } from '../Turf';
import { CardForm } from '../Forms';
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
      hometurf = [],
      nearbyturf = [];

    this.setState({ loading: true });

    try {
      [volunteer, forms, turf] = await Promise.all([
        _loadVolunteer(global, this.props.id),
        _loadForms(global),
        _loadTurfs(global),
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load canavasser info.');
      return this.setState({ loading: false });
    }

    if (volunteer.location) {
      hometurf = await _loadNearbyTurfs(global, volunteer.location.x, volunteer.location.y, 0);
      nearbyturf = await _loadNearbyTurfs(global, volunteer.location.x, volunteer.location.y, NEARBY_DIST);
    }

    let selectedFormsOption = [];
    let selectedTurfOption = [];

    let formOptions = [{ value: '', label: 'None' }];

    let turfOptions = [
      { value: '', label: 'None' }
    ];

    forms.forEach(f => {
      formOptions.push({
        value: _searchStringify(f),
        id: f.id,
        label: <CardForm global={global} key={f.id} form={f} refer={this} />
      });
    });

    volunteer.ass.forms.forEach(f => {
      selectedFormsOption.push({
        value: _searchStringify(f),
        id: f.id,
        label: <CardForm global={global} key={f.id} form={f} refer={this} />
      });
    });

    turf.forEach(t => {
      turfOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTurf global={global} key={t.id} turf={t} refer={this} />
      });
    });

    volunteer.ass.turfs.forEach(t => {
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
    });

    this.setState({
      loading: false,
      volunteer,
      formOptions,
      turfOptions,
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
