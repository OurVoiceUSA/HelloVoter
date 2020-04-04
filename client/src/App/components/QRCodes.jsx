import React, { Component } from 'react';

import { HashRouter as Router, Route } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import ReactTooltip from 'react-tooltip';
import Select from 'react-select';
import EdiText from 'react-editext';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Checkbox from '@material-ui/core/Checkbox';
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
  _loadForms,
  _loadTurfs,
  _inviteLink,
  RootLoader,
  Icon,
  DialogSaving
} from '../common.js';

import { CardTurf } from './Turf';
import { CardForm } from './Forms';

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
              path="/qrcode/"
              render={() => <ListQRCodes global={global} refer={this} qrcodes={qrcodes} />}
            />
            <Route
              path="/qrcode/view/:id"
              render={props => (
                <CardQRCode
                  global={global}
                  key={props.match.params.id}
                  id={props.match.params.id}
                  edit={true}
                  refer={this}
                />
              )}
            />
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
          '/qrcode/create',
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
          '/qrcode/form/add',
          'POST',
          { formId: add, qId: this.props.id }
        ));
      });

      obj.rm.forEach(rm => {
        adrm.push(_fetch(
          global,
          '/qrcode/form/remove',
          'POST',
          { formId: rm, qId: this.props.id }
        ));
      });

      await Promise.all(adrm);

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

      let adrm = [];

      obj.add.forEach(add => {
        adrm.push(_fetch(
          global,
          '/qrcode/turf/add',
          'POST',
          { turfId: add, qId: this.props.id }
        ));
      });

      obj.rm.forEach(rm => {
        adrm.push(_fetch(
          global,
          '/qrcode/turf/remove',
          'POST',
          { turfId: rm, qId: this.props.id }
        ));
      });

      await Promise.all(adrm);

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
      turf = [];

    this.setState({ loading: true });

    try {
      [qrcode, forms, turf] = await Promise.all([
        _loadQRCode(global, this.props.id),
        _loadForms(global),
        _loadTurfs(global),
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load canavasser info.');
      return this.setState({ loading: false });
    }

    let leaderOptions = [];
    let selectedFormsOption = [];
    let selectedTurfOption = [];

    let formOptions = [{ value: '', label: 'None' }];

    let turfOptions = [
      { value: '', label: 'None' },
    ];

    forms.forEach(f => {
      formOptions.push({
        value: _searchStringify(f),
        id: f.id,
        label: <CardForm global={global} key={f.id} form={f} refer={this} />
      });
    });

    qrcode.ass.forms.forEach(f => {
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

    qrcode.ass.turfs.forEach(t => {
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
    });

    this.setState({
      loading: false,
      qrcode,
      leaderOptions,
      formOptions,
      turfOptions,
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
        '/qrcode/disable',
        'POST',
        { id: qrcode.id }
      );
      notify_success('QRCode has been disabled.');
    } catch (e) {
      notify_error(e, 'Unable to disable QRCode.');
    }
    this.props.refer.setState({ saving: false });

    this.props.refer._loadData();
  };

  onAutoTurfToggle = async (x,val) => {
    const { global, qrcode } = this.state;

    this.props.refer.setState({ saving: true });
    try {
      await _fetch(
        global,
        '/qrcode/update',
        'POST',
        { id: qrcode.id, autoturf: val }
      );
      notify_success('QRCode has been updated.');
    } catch (e) {
      notify_error(e, 'Unable to update QRCode.');
    }
    this.props.refer.setState({ saving: false });

    this.props.refer._loadData();
  }

  onSave = async (val) => {
    const { global, qrcode } = this.state;

    this.props.refer.setState({ saving: true });
    try {
      await _fetch(
        global,
        '/qrcode/update',
        'POST',
        { id: qrcode.id, name: val }
      );
      notify_success('QRCode has been updated.');
    } catch (e) {
      notify_error(e, 'Unable to update QRCode.');
    }
    this.props.refer.setState({ saving: false });

    this.props.refer._loadData();
  }

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
          <CardQRCodeFull global={global} qrcode={qrcode} refer={this} link={_inviteLink(qrcode.id, global.state.server, global.state.orgId)} onSave={this.onSave} onAutoTurfToggle={this.onAutoTurfToggle} />
        </div>
      );

    return (
      <ListItem
        button
        style={{ width: 350 }}
        alignItems="flex-start"
        onClick={() => {
          this.props.refer.setState({ thisQRCode: qrcode });
          window.location.href = "/HelloVoterHQ/#/qrcode/view/"+qrcode.id;
        }}>
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
    <h1><EdiText type="text" value={props.qrcode.name} onSave={props.onSave} /></h1>
    <br />
    <br />
    Link to use on a mobile device: <a target="_blank" rel="noopener noreferrer" href={props.link}>{props.link}</a>
    <br />
    <br />
    Last Used:{' '}
    {(props.qrcode.last_used?new TimeAgo('en-US').format(new Date(props.qrcode.last_used-30000)):'Never')}
    <br />
    Number of people who've used it: {props.qrcode.num_volunteers}
    <br />
    <br />
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
      Auto-assign nearest turf: <Checkbox color="primary" checked={(props.qrcode.autoturf?true:false)} onChange={props.onAutoTurfToggle} />
      <br />
      {!props.qrcode.autoturf&&
      <div>
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
      }
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
