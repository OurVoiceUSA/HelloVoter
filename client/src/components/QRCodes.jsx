import React, { Component } from 'react';

import { HashRouter as Router, Route } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import ReactTooltip from 'react-tooltip';
import Select from 'react-select';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';

import Modal from '@material-ui/core/Modal';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';

import {
  notify_error,
  notify_success,
  _fetch,
  _searchStringify,
  _handleSelectChange,
  _loadQRCode,
  _loadQRCodes,
  _loadTeams,
  _loadForms,
  _loadTurfs,
  RootLoader,
  Icon,
  DialogSaving
} from '../common.js';

import { CardTurf } from './Turf';
import { CardForm } from './Forms';
import { CardTeam } from './Teams';

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
TimeAgo.locale(en);

export default class QRCodes extends Component {
  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('qrcodesperpage');
    if (!perPage) perPage = 5;

    this.state = {
      global: props.global,
      loading: true,
      thisQRCode: {},
      qrcodes: [],
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
    localStorage.setItem('qrcodesperpage', obj.value);
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

    let qrcodes = [];
    this.setState({ loading: true, search: '' });
    try {
      qrcodes = await _loadQRCodes(global);
    } catch (e) {
      notify_error(e, 'Unable to load qrcodes.');
    }
    this.setState({ loading: false, qrcodes });
  };

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  };

  render() {
    const { global } = this.state;

    let qrcodes = [];

    this.state.qrcodes.forEach(c => {
      if (this.state.search && !_searchStringify(c).includes(this.state.search))
        return;
      qrcodes.push(c);
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
            <Route
              exact={true}
              path="/qrcodes/"
              render={() => <ListQRCodes global={global} refer={this} qrcodes={qrcodes} />}
            />
            <Route
              path="/qrcodes/view/:id"
              render={props => (
                <CardQRCode
                  global={global}
                  key={props.match.params.id}
                  id={props.match.params.id}
                  edit={true}
                />
              )}
            />
            <Modal
              aria-labelledby="simple-modal-title"
              aria-describedby="simple-modal-description"
              open={this.state.thisQRCode.id ? true : false}
              onClose={() => this.setState({ thisQRCode: {} })}
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
                <CardQRCode
                  global={global}
                  key={this.state.thisQRCode.id}
                  id={this.state.thisQRCode.id}
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

const ListQRCodes = props => {
  const perPage = props.refer.state.perPage;
  let paginate = <div />;
  let list = [];

  props.qrcodes.forEach((c, idx) => {
    let tp = Math.floor(idx / perPage) + 1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardQRCode global={props.global} key={c.id} qrcode={c} refer={props.refer} />);
  });

  paginate = (
    <div style={{ display: 'flex' }}>
      <ReactPaginate
        previousLabel={'previous'}
        nextLabel={'next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={props.qrcodes.length / perPage}
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
        {props.type}QRCodes ({props.qrcodes.length})
      </h3>
      {paginate}
      <List component="nav">{list}</List>
      {paginate}
      <Button onClick={async () => {
        let obj = await _fetch(
          props.global,
          '/qrcodes/create',
          'POST'
        );
        if (obj && obj.id) {
          props.refer.setState({ thisQRCode: obj});
          props.refer._loadData();
        } else {
          notify_error({}, 'QRCode creation failed.');
        }
      }} color="primary">
        Generate QR CODE
      </Button>
    </div>
  );
};

export class CardQRCode extends Component {
  constructor(props) {
    super(props);

    this.state = {
      global: props.global,
      refer: this.props.refer.props.refer,
      qrcode: this.props.qrcode,
      selectedTeamsOption: [],
      selectedFormsOption: [],
      selectedTurfOption: [],
    };
  }

  componentDidMount() {
    if (!this.state.qrcode) this._loadData();

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

      for (let i in obj.add) {
        await _fetch(
          global,
          '/qrcodes/team/add',
          'POST',
          { teamId: obj.add[i], qId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          global,
          '/qrcodes/team/remove',
          'POST',
          { teamId: obj.rm[i], qId: this.props.id }
        );
      }

      // refresh info
      let qrcode = await _loadQRCode(global, this.props.id);
      notify_success('Team assignments saved.');
      this.setState({
        selectedTeamsOption,
        qrcode
      });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
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

      for (let i in obj.add) {
        await _fetch(
          global,
          '/qrcodes/form/add',
          'POST',
          { formId: obj.add[i], qId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          global,
          '/qrcodes/form/remove',
          'POST',
          { formId: obj.rm[i], qId: this.props.id }
        );
      }

      // refresh info
      let qrcode = await _loadQRCode(global, this.props.id);
      notify_success('Form selection saved.');
      this.setState({ selectedFormsOption, qrcode });
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

      for (let i in obj.add) {
        await _fetch(
          global,
          '/qrcodes/turf/add',
          'POST',
          { turfId: obj.add[i], qId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          global,
          '/qrcodes/turf/remove',
          'POST',
          { turfId: obj.rm[i], qId: this.props.id }
        );
      }

      // refresh info
      let qrcode = await _loadQRCode(global, this.props.id);
      notify_success('Turf selection saved.');
      this.setState({ selectedTurfOption, qrcode });
    } catch (e) {
      notify_error(e, 'Unable to add/remove turf.');
    }
    this.props.refer.setState({ saving: false });
  };

  _loadData = async () => {
    const { global } = this.state;

    let qrcode = {},
      forms = [],
      turf = [],
      teams = [];

    this.setState({ loading: true });

    try {
      [qrcode, forms, turf, teams] = await Promise.all([
        _loadQRCode(global, this.props.id),
        _loadForms(global),
        _loadTurfs(global),
        _loadTeams(global),
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load canavasser info.');
      return this.setState({ loading: false });
    }

    let teamOptions = [];
    let leaderOptions = [];
    let selectedTeamsOption = [];
    let selectedFormsOption = [];
    let selectedTurfOption = [];

    let formOptions = [{ value: '', label: 'None' }];

    let turfOptions = [
      { value: '', label: 'None' },
    ];

    teams.forEach(t => {
      teamOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam global={global} key={t.id} team={t} refer={this} />
      });
      qrcode.ass.teams.forEach((a, idx) => {
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

    qrcode.ass.forms.forEach(f => {
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

    qrcode.ass.turfs.forEach(t => {
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
            />
          )
        });
      }
    });

    this.setState({
      loading: false,
      qrcode,
      teamOptions,
      leaderOptions,
      formOptions,
      turfOptions,
      selectedTeamsOption,
      selectedFormsOption,
      selectedTurfOption,
    });
  };

  _disableQRCode = async (qrcode, flag) => {
    const { global } = this.state;

    this.props.refer.setState({ saving: true });
    try {
      await _fetch(
        global,
        '/qrcodes/disable',
        'POST',
        { id: qrcode.id }
      );
      notify_success('QRCode hass been disabled.');
    } catch (e) {
      notify_error(e, 'Unable to disable QRCode.');
    }
    this.props.refer.setState({ saving: false });

    this._loadData();
  };

  render() {
    const { global, qrcode } = this.state;

    if (!qrcode || this.state.loading) {
      return <CircularProgress />;
    }

    if (this.props.edit)
      return (
        <div>
          <ListItem alignItems="flex-start" style={{ width: 350 }}>
            <ListItemAvatar>
              <img alt="QR Code" src={qrcode.img} />
            </ListItemAvatar>
          </ListItem>
          <CardQRCodeFull global={global} qrcode={qrcode} refer={this} />
        </div>
      );

    return (
      <ListItem
        button
        style={{ width: 350 }}
        alignItems="flex-start"
        onClick={() => this.props.refer.setState({ thisQRCode: qrcode })}
      >
        <ListItemAvatar>
          <Icon icon={faQrcode} size={"large"} />
        </ListItemAvatar>
        <ListItemText
          primary={qrcode.name}
          secondary={""}
        />
      </ListItem>
    );
  }
}

export const CardQRCodeFull = props => (
  <div>
    <h1>{props.qrcode.name}{(props.qrcode.disabled?' (DISABLED)':'')}</h1>
    <br />
    Last Used:{' '}
    {(props.qrcode.last_used?new TimeAgo('en-US').format(new Date(props.qrcode.last_used-30000)):'Never')}
    <br />
    Number of people who've used it: {props.qrcode.num_volunteers}
    <br />
    <br />
    <div>
      Teams this QRCode gives access to:
      <Select
        value={props.refer.state.selectedTeamsOption}
        onChange={props.refer.handleTeamsChange}
        options={props.refer.state.teamOptions}
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
        {props.qrcode.ass.forms.filter(f => !f.direct).map(f => (
          <CardForm global={global} key={f.id} form={f} refer={props.refer} />
        ))}
        {props.qrcode.ass.turfs.filter(t => !t.direct).map(t => (
          <CardTurf global={global} key={t.id} turf={t} refer={props.refer} />
        ))}
      </div>
    ):''
    }
    <div>
      Forms this QRCode gives access to:
      <Select
        value={props.refer.state.selectedFormsOption}
        onChange={props.refer.handleFormsChange}
        options={props.refer.state.formOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Turf this QRCode gives access to:
      <Select
        value={props.refer.state.selectedTurfOption}
        onChange={props.refer.handleTurfChange}
        options={props.refer.state.turfOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
    <br />
    {props.qrcode.disabled&&
    <div>This QR Code is disabled</div>
    }
    {!props.qrcode.disabled&&
    <Button onClick={() => props.refer._disableQRCode(props.qrcode, false)}>
      Disable QRCode
    </Button>
    }
  </div>
);

