import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import t from 'tcomb-form';

import {
  notify_error, notify_success, _fetch,  _handleSelectChange, _searchStringify,
  _loadVolunteers, _loadTeams, _loadTeam, _loadForms, _loadTurfs,
  RootLoader, Loader, Icon, DialogSaving,
} from '../common.js';

import { CardTurf } from './Turf.js';
import { CardForm } from './Forms.js';
import { CardVolunteer } from './Volunteers.js';

import { faUsers } from '@fortawesome/free-solid-svg-icons';

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
TimeAgo.locale(en);

export default class App extends Component {

  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('teamsperpage');
    if (!perPage) perPage = 5;

    this.state = {
      loading: true,
      teams: [],
      search: "",
      perPage: perPage,
      pageNum: 1,
    };

    this.formServerItems = t.struct({
      name: t.String,
    });

    this.formServerOptions = {
      fields: {
        server: {
          label: 'Team Name',
          error: 'You must enter a team name.',
        },
      },
    };

    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  componentDidMount() {
    this._loadData();
  }

  onChangeTeam(addTeamForm) {
    this.setState({addTeamForm})
  }

  handlePageNumChange(obj) {
    localStorage.setItem('teamsperpage', obj.value);
    this.setState({pageNum: 1, perPage: obj.value});
  }

  onTypeSearch (event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1,
    })
  }

  _deleteTeam = async (id) => {
    try {
      await _fetch(this.props.server, '/volunteer/v1/team/delete', 'POST', {teamId: id});
    } catch (e) {
      notify_error(e, "Unable to delete teams.");
    }

    window.location.href = "/HelloVoter/#/teams/";
    this._loadData();
    notify_success("Team has been deleted.");
  }

  _createTeam = async () => {
    let json = this.addTeamForm.getValue();
    if (json === null) return;

    try {
      await _fetch(this.props.server, '/volunteer/v1/team/create', 'POST', {name: json.name});
    } catch (e) {
      notify_error(e, "Unable to create team.");
    }

    window.location.href = "/HelloVoter/#/teams/";
    this._loadData();
    notify_success("Team has been created.");
  }

  _loadData = async () => {
    let teams = [];
    this.setState({loading: true, search: ""});
    try {
      teams = await _loadTeams(this);
    } catch (e) {
      notify_error(e, "Unable to load volunteers.");
    }
    this.setState({loading: false, teams});
  }

  handlePageClick = (data) => {
    this.setState({pageNum: data.selected+1});
  }

  render() {
    let list = [];

    this.state.teams.forEach(t => {
      if (this.state.search && !_searchStringify(t).includes(this.state.search)) return;
        list.push(t);
    });

    return (
      <Router>
        <div>
          <Route exact={true} path="/teams/" render={() => (
            <RootLoader flag={this.state.loading} func={this._loadData}>
              Search: <input type="text" value={this.state.value} onChange={this.onTypeSearch} data-tip="Search by name, email, location, or admin" />
              <ListTeams refer={this} teams={list} />
            </RootLoader>
          )} />
          <Route exact={true} path="/teams/add" render={() => (
            <div>
              <t.form.Form
                ref={(ref) => this.addTeamForm = ref}
                type={this.formServerItems}
                options={this.formServerOptions}
                onChange={(e) => this.onChangeTeam(e)}
                value={this.state.addTeamForm}
              />
              <button onClick={() => this._createTeam()}>
                Submit
              </button>
            </div>
          )} />
          <Route path="/teams/view/:id" render={(props) => (
            <div>
              <CardTeam key={props.match.params.id} id={props.match.params.id} edit={true} refer={this} />
              <br />
              <br />
              <br />
              <button onClick={() => this._deleteTeam(props.match.params.id)}>Delete Team</button>
            </div>
          )} />
          <DialogSaving flag={this.state.saving} />
        </div>
      </Router>
    );
  }
}

const ListTeams = (props) => {
  const perPage = props.refer.state.perPage;
  let paginate = (<div></div>);
  let list = [];

  props.teams.forEach((t, idx) => {
    let tp = Math.floor(idx/perPage)+1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardTeam key={t.id} team={t} refer={props.refer} />);
  });

  paginate = (
    <div style={{display: 'flex'}}>
      <ReactPaginate previousLabel={"previous"}
        nextLabel={"next"}
        breakLabel={"..."}
        breakClassName={"break-me"}
        pageCount={props.teams.length/perPage}
        marginPagesDisplayed={1}
        pageRangeDisplayed={8}
        onPageChange={props.refer.handlePageClick}
        containerClassName={"pagination"}
        subContainerClassName={"pages pagination"}
        activeClassName={"active"}
      />
      &nbsp;&nbsp;&nbsp;
      <div style={{width: 75}}>
      # Per Page <Select
        value={{value: perPage, label: perPage}}
        onChange={props.refer.handlePageNumChange}
        options={[
          {value: 5, label: 5},
          {value: 10, label: 10},
          {value: 25, label: 25},
          {value: 50, label: 50},
          {value: 100, label: 100}
        ]}
      />
      </div>
    </div>
  );

  return (
    <div>
      <h3>{props.type}Teams ({props.teams.length})</h3>
      <Link to={'/teams/add'}><button>Add Team</button></Link>
      {paginate}
      {list}
      {paginate}
     </div>
   );
};

export class CardTeam extends Component {

  constructor(props) {
    super(props);

    this.state = {
      server: this.props.refer.props.server,
      team: this.props.team,
      selectedMembersOption: [],
      selectedFormsOption: [],
      selectedTurfOption: [],
    };

  }

  componentDidMount() {
    if (!this.state.team) this._loadData();
  }

  handleMembersChange = async (selectedMembersOption) => {
    this.props.refer.setState({saving: true});
    try {
      let obj = _handleSelectChange(this.state.selectedMembersOption, selectedMembersOption);

      for (let i in obj.add) {
        await _fetch(this.state.server, '/volunteer/v1/team/members/add', 'POST', {teamId: this.props.id, cId: obj.add[i]});
      }

      for (let i in obj.rm) {
        await _fetch(this.state.server, '/volunteer/v1/team/members/remove', 'POST', {teamId: this.props.id, cId: obj.rm[i]});
      }

      // refresh team info
      let team = await _loadTeam(this, this.props.id);
      notify_success("Team assignments saved.");
      this.setState({ selectedMembersOption, team });
    } catch (e) {
      notify_error(e, "Unable to add/remove team members.");
    }
    this.props.refer.setState({saving: false});
  }

  handleFormsChange = async (selectedFormsOption) => {
    this.props.refer.setState({saving: true});
    try {
      let obj = _handleSelectChange(this.state.selectedFormsOption, selectedFormsOption);

      for (let i in obj.add) {
        await _fetch(this.state.server, '/volunteer/v1/form/assigned/team/add', 'POST', {formId: obj.add[i], teamId: this.props.id});
      }

      for (let i in obj.rm) {
        await _fetch(this.state.server, '/volunteer/v1/form/assigned/team/remove', 'POST', {formId: obj.rm[i], teamId: this.props.id});
      }

      // refresh team info
      let teamn = await _loadTeam(this, this.props.id);
      notify_success("Form selection saved.");
      this.setState({teamn, selectedFormsOption});
    } catch (e) {
      notify_error(e, "Unable to add/remove form.");
    }
    this.props.refer.setState({saving: false});
  }

  handleTurfChange = async (selectedTurfOption) => {
    this.props.refer.setState({saving: true});
    try {
      let obj = _handleSelectChange(this.state.selectedTurfOption, selectedTurfOption);

      for (let i in obj.add) {
        await _fetch(this.state.server, '/volunteer/v1/turf/assigned/team/add', 'POST', {turfId: obj.add[i], teamId: this.props.id});
      }

      for (let i in obj.rm) {
        await _fetch(this.state.server, '/volunteer/v1/turf/assigned/team/remove', 'POST', {turfId: obj.rm[i], teamId: this.props.id});
      }

      // refresh team info
      let team = await _loadTeam(this, this.props.id);
      notify_success("Turf selection saved.");
      this.setState({team, selectedTurfOption});
    } catch (e) {
      notify_error(e, "Unable to add/remove turf.");
    }
    this.props.refer.setState({saving: false});
  }

  _loadData = async () => {
    let team = {}, volunteers = [], members = [], turfSelected = [], turfs = [], formSelected = [], forms = [];
    this.setState({loading: true})

    try {
      [team, volunteers, members, turfSelected, turfs, formSelected, forms] = await Promise.all([
        _loadTeam(this, this.props.id),
        _loadVolunteers(this.props.refer),
        _loadVolunteers(this.props.refer, 'team', this.props.id),
        _loadTurfs(this.props.refer, this.props.id),
        _loadTurfs(this.props.refer),
        _loadForms(this.props.refer, this.props.id),
        _loadForms(this.props.refer),
      ]);
    } catch (e) {
      notify_error(e, "Unable to load team info.");
      return this.setState({loading: false});
    }

    let memberOptions = [];
    let formOptions = [];
    let turfOptions = [];
    let selectedMembersOption = [];
    let selectedTurfOption = [];
    let selectedFormsOption = [];

    volunteers.forEach((c) => {
      memberOptions.push({value: _searchStringify(c), id: c.id, label: (<CardVolunteer key={c.id} volunteer={c} refer={this} />)});
    });

    members.forEach((c) => {
      selectedMembersOption.push({value: _searchStringify(c), id: c.id, label: (<CardVolunteer key={c.id} volunteer={c} refer={this} />)});
    });

    turfs.forEach((t) => {
      turfOptions.push({value: _searchStringify(t), id: t.id, label: (<CardTurf key={t.id} turf={t} refer={this} />)});
    })

    turfSelected.forEach((t) => {
      selectedTurfOption.push({value: _searchStringify(t), id: t.id, label: (<CardTurf key={t.id} turf={t} refer={this} />)});
    })

    forms.forEach((f) => {
      formOptions.push({value: _searchStringify(f), id: f.id, label: (<CardForm key={f.id} form={f} refer={this} />)});
    })

    formSelected.forEach((f) => {
      selectedFormsOption.push({value: _searchStringify(f), id: f.id, label: (<CardForm key={f.id} form={f} refer={this} />)});
    })

    this.setState({team, memberOptions, turfOptions, formOptions, selectedMembersOption, selectedTurfOption, selectedFormsOption, loading: false});
  }

  render() {
    const { team } = this.state;

    if (!team || this.state.loading) {
      return (<Loader />);
    }

    return (
      <div>
        <div style={{display: 'flex', padding: '10px'}}>
          <div style={{flex: 1, overflow: 'auto', padding: '5px 10px'}}>
            <Icon icon={faUsers} style={{width: 50, height: 50, color: "gray"}} /> {team.name} {(this.props.edit?'':(<Link to={'/teams/view/'+team.id}>view</Link>))}
          </div>
        </div>
        {this.props.edit?<CardTeamFull team={team} refer={this} />:''}
      </div>
    );
  }
}

export const CardTeamFull = (props) => (
  <div>
    <br />
    <div>
      Members of this team:
      <Select
        value={props.refer.state.selectedMembersOption}
        onChange={props.refer.handleMembersChange}
        options={props.refer.state.memberOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
    <br />
    <div>
      Form this team is assigned to:
      <Select
        value={props.refer.state.selectedFormsOption}
        onChange={props.refer.handleFormsChange}
        options={props.refer.state.formOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Turf this team assigned to:
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
