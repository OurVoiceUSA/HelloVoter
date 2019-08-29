import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import t from 'tcomb-form';

import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import {
  faClipboard
} from '@fortawesome/free-solid-svg-icons';

import { CardVolunteer } from './Volunteers.jsx';
import { CardTeam } from './Teams.jsx';

import {
  _fetch,
  notify_error,
  notify_success,
  _handleSelectChange,
  _searchStringify,
  _loadForms,
  _loadForm,
  _loadAttributes,
  _loadVolunteers,
  _loadTeams,
  RootLoader,
  Icon,
  DialogSaving
} from '../common.js';

// a little function to help us with reordering the result
const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};

/**
 * Moves an item from one list to another list.
 */
const move = (source, destination, droppableSource, droppableDestination) => {
    const sourceClone = Array.from(source);
    const destClone = Array.from(destination);
    const [removed] = sourceClone.splice(droppableSource.index, 1);

    destClone.splice(droppableDestination.index, 0, removed);

    const result = {};
    result[droppableSource.droppableId] = sourceClone;
    result[droppableDestination.droppableId] = destClone;

    return result;
};

const grid = 8;

const getItemStyle = (isDragging, draggableStyle) => ({
    // some basic styles to make the items look a bit nicer
    userSelect: 'none',
    padding: grid * 2,
    margin: `0 0 ${grid}px 0`,

    // change background colour if dragging
    background: isDragging ? 'lightgreen' : 'grey',

    // styles we need to apply on draggables
    ...draggableStyle
});

const getListStyle = isDraggingOver => ({
    background: isDraggingOver ? 'lightblue' : 'lightgrey',
    padding: grid,
    width: 250
});

export default class Forms extends Component {
  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('formsperpage');
    if (!perPage) perPage = 5;

    // TODO: this is only for brand new forms
    let fields = {};
    let order = Object.keys(fields);

    this.state = {
      global: props.global,
      loading: true,
      forms: [],
      attributes: [],
      attributes_selected: [],
      fields: fields,
      order: order,
      search: '',
      perPage: perPage,
      pageNum: 1,
      menuDelete: false
    };

    this.id2List = {
        droppable: 'attributes',
        droppable2: 'attributes_selected',
    };

    this.formServerItems = t.struct({
      name: t.String
    });

    this.formServerOptions = {
      fields: {
        name: {
          label: 'Form Name',
          error: 'You must enter a form name.'
        }
      }
    };

    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  getList = id => this.state[this.id2List[id]];

  onDragEnd = result => {
      const { source, destination } = result;

      // dropped outside the list
      if (!destination) {
          return;
      }

      if (source.droppableId === destination.droppableId) {
          const attributes = reorder(
              this.getList(source.droppableId),
              source.index,
              destination.index
          );

          let state = { attributes };

          if (source.droppableId === 'droppable2') {
              state = { attributes_selected: attributes };
          }

          this.setState(state);
      } else {
          const result = move(
              this.getList(source.droppableId),
              this.getList(destination.droppableId),
              source,
              destination
          );

          this.setState({
              attributes: result.droppable,
              attributes_selected: result.droppable2
          });
      }
  };

  handleClickDelete = () => {
    this.setState({ menuDelete: true });
  };

  handleCloseDelete = () => {
    this.setState({ menuDelete: false });
  };

  handlePageNumChange(obj) {
    localStorage.setItem('volunteersperpage', obj.value);
    this.setState({ pageNum: 1, perPage: obj.value });
  }

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  };

  onTypeSearch(event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1
    });
  }

  inputTypeToReadable(type) {
    switch (type) {
    case 'String':
      return 'Text Input';
    case 'TEXTBOX':
      return 'Text Box';
    case 'Number':
      return 'Number';
    case 'Boolean':
      return 'On/Off Switch';
    case 'SAND':
      return 'Agree/Disagree';
    case 'List':
      return 'Select from List';
    default:
      return type;
    }
  }

  onChangeForm(addFormForm) {
    this.setState({ addFormForm });
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    const { global } = this.state;

    this.setState({ loading: true });
    let forms = [];
    let attributes = [], attributes_selected = [];
    let fields = {};

    try {
      forms = await _loadForms(global);
      attributes = await _loadAttributes(global);

      // convert attributes to fields
      attributes.forEach(a => {
        fields[a.id] = { label: a.name, type: a.type, optional: true, options: a.values };
      });
    } catch (e) {
      notify_error(e, 'Unable to load forms.');
    }
    this.setState({ forms, attributes, attributes_selected, fields, loading: false });
  };

  _deleteForm = async id => {
    const { global } = this.state;

    this.setState({ saving: true, menuDelete: false });
    try {
      await _fetch(global, '/form/delete', 'POST', {
        formId: id
      });
      notify_success('Form has been deleted.');
    } catch (e) {
      notify_error(e, 'Unable to delete form.');
    }
    this.setState({ saving: false });

    window.location.href = '/HelloVoterHQ/#/forms/';
    this._loadData();
  };

  _createForm = async () => {
    const { global } = this.state;

    let json = this.addFormForm.getValue();
    if (json === null) return;

    // get rid of ending whitespace
    let formName = json.name.trim();

    // disallow anything other than alphanumeric and a few other chars
    if (!formName.match(/^[a-zA-Z0-9\-_ ]+$/)) {
      notify_error(
        {},
        'From name can only contain alphanumeric characters, and spaces and dashes.'
      );
      return;
    }

    // max length
    if (formName.length > 255) {
      notify_error({}, 'Form name cannot be longer than 255 characters.');
      return;
    }

    this.setState({ saving: true });

    // make sure this name doesn't exist
    try {
      let obj;

      obj = {
        name: formName,
        attributes: Object.keys(this.state.fields),
      };

      await _fetch(global, '/form/create', 'POST', obj);
      notify_success('Form has been created.');
    } catch (e) {
      notify_error(e, 'Unable to create form.');
    }
    this.setState({ saving: false });

    window.location.href = '/HelloVoterHQ/#/forms/';
    this._loadData();
  };

  render() {
    const { global } = this.state;

    let list = [];

    this.state.forms.forEach(f => {
      if (this.state.search && !_searchStringify(f).includes(this.state.search))
        return;
      list.push(f);
    });

    return (
      <Router>
        <div>
          <Route
            exact={true}
            path="/forms/"
            render={() => (
              <RootLoader
                flag={this.state.loading}
                func={() => this._loadData()}
              >
                Search:{' '}
                <input
                  type="text"
                  value={this.state.value}
                  onChange={this.onTypeSearch}
                  data-tip="Search by name, email, location, or admin"
                />
                <br />
                <ListForms global={global} forms={list} refer={this} />
              </RootLoader>
            )}
          />
          <Route
            path="/forms/add"
            render={props => (
              <div>
                <t.form.Form
                  ref={ref => (this.addFormForm = ref)}
                  type={this.formServerItems}
                  options={this.formServerOptions}
                  onChange={e => this.onChangeForm(e)}
                  value={this.state.addFormForm}
                />

                <div style={{display: 'flex', flexDirection: 'row'}}>
                  <DragDropContext onDragEnd={this.onDragEnd}>
                      <Droppable droppableId="droppable">
                          {(provided, snapshot) => (
                              <div
                                  ref={provided.innerRef}
                                  style={getListStyle(snapshot.isDraggingOver)}>
                                  {this.state.attributes.map((item, index) => (
                                      <Draggable
                                          key={item.id}
                                          draggableId={item.id}
                                          index={index}>
                                          {(provided, snapshot) => (
                                              <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  {...provided.dragHandleProps}
                                                  style={getItemStyle(
                                                      snapshot.isDragging,
                                                      provided.draggableProps.style
                                                  )}>
                                                  {item.label + (item.required ? ' *' : '')} :{' '}
                                                  {this.inputTypeToReadable(item.type)}{' '}
                                              </div>
                                          )}
                                      </Draggable>
                                  ))}
                                  {provided.placeholder}
                              </div>
                          )}
                      </Droppable>
                      &nbsp;
                      Drag to assign
                      &nbsp;
                      <Droppable droppableId="droppable2">
                          {(provided, snapshot) => (
                              <div
                                  ref={provided.innerRef}
                                  style={getListStyle(snapshot.isDraggingOver)}>
                                  {this.state.attributes_selected.map((item, index) => (
                                      <Draggable
                                          key={item.id}
                                          draggableId={item.id}
                                          index={index}>
                                          {(provided, snapshot) => (
                                              <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  {...provided.dragHandleProps}
                                                  style={getItemStyle(
                                                      snapshot.isDragging,
                                                      provided.draggableProps.style
                                                  )}>
                                                  {item.label + (item.required ? ' *' : '')} :{' '}
                                                  {this.inputTypeToReadable(item.type)}{' '}
                                                  <Checkbox value="ack" color="primary" /> Readonly
                                              </div>
                                          )}
                                      </Draggable>
                                  ))}
                                  {provided.placeholder}
                              </div>
                          )}
                      </Droppable>
                  </DragDropContext>
                </div>

                <button
                  style={{ margin: 25 }}
                  onClick={() => this._createForm()}
                >
                  Create Form
                </button>

              </div>
            )}
          />
          <Route
            path="/forms/view/:id"
            render={props => (
              <div>
                <CardForm
                  global={global}
                  key={props.match.params.id}
                  id={props.match.params.id}
                  edit={true}
                  refer={this}
                />
                <br />
                <br />
                <br />
                <Button onClick={this.handleClickDelete} color="primary">
                  Delete Form
                </Button>
                <Dialog
                  open={this.state.menuDelete}
                  onClose={this.handleCloseDelete}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                    Are you sure you wish to delete this form?
                  </DialogTitle>
                  <DialogActions>
                    <Button
                      onClick={this.handleCloseDelete}
                      color="primary"
                      autoFocus
                    >
                      No
                    </Button>
                    <Button
                      onClick={() => this._deleteForm(props.match.params.id)}
                      color="primary"
                    >
                      Yes
                    </Button>
                  </DialogActions>
                </Dialog>
              </div>
            )}
          />
          <DialogSaving flag={this.state.saving} />
        </div>
      </Router>
    );
  }
}

const ListForms = props => {
  const perPage = props.refer.state.perPage;
  let paginate = <div />;
  let list = [];

  props.forms.forEach((f, idx) => {
    let tp = Math.floor(idx / perPage) + 1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardForm global={props.global} key={f.id} form={f} refer={props.refer} />);
  });

  paginate = (
    <div style={{ display: 'flex' }}>
      <ReactPaginate
        previousLabel={'previous'}
        nextLabel={'next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={props.forms.length / perPage}
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
        {props.type}Forms ({props.forms.length})
      </h3>
      <Link to={'/forms/add'}>
        <button>Add Form</button>
      </Link>
      {paginate}
      {list}
      {paginate}
    </div>
  );
};

export class CardForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      global: props.global,
      form: this.props.form,
      selectedTeamsOption: [],
      selectedMembersOption: []
    };
  }

  componentDidMount() {
    if (!this.state.form) this._loadData();
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
          '/form/assigned/team/add',
          'POST',
          { teamId: obj.add[i], formId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          global,
          '/form/assigned/team/remove',
          'POST',
          { teamId: obj.rm[i], formId: this.props.id }
        );
      }

      notify_success('Team assignments saved.');
      this.setState({ selectedTeamsOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleMembersChange = async selectedMembersOption => {
    const { global } = this.state;

    if (!selectedMembersOption) selectedMembersOption = [];
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedMembersOption,
        selectedMembersOption
      );

      for (let i in obj.add) {
        await _fetch(
          global,
          '/form/assigned/volunteer/add',
          'POST',
          { vId: obj.add[i], formId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          global,
          '/form/assigned/volunteer/remove',
          'POST',
          { vId: obj.rm[i], formId: this.props.id }
        );
      }

      notify_success('Volunteer assignments saved.');
      this.setState({ selectedMembersOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  _loadData = async () => {
    const { global } = this.state;

    let form = {},
      volunteers = [],
      members = [],
      teams = [],
      teamsSelected = [];

    this.setState({ loading: true });

    try {
      [form, volunteers, members, teams, teamsSelected] = await Promise.all([
        _loadForm(global, this.props.id, true),
        _loadVolunteers(global),
        _loadVolunteers(global, 'form', this.props.id),
        _loadTeams(global),
        _loadTeams(global, 'form', this.props.id)
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load form info.');
      return this.setState({ loading: false });
    }

    let teamOptions = [];
    let membersOption = [];
    let selectedTeamsOption = [];
    let selectedMembersOption = [];

    teams.forEach(t => {
      teamOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam global={global} key={t.id} team={t} refer={this} />
      });
    });

    teamsSelected.forEach(t => {
      selectedTeamsOption.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam global={global} key={t.id} team={t} refer={this} />
      });
    });

    volunteers.forEach(c => {
      membersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer global={global} key={c.id} volunteer={c} refer={this} />
      });
    });

    members.forEach(c => {
      selectedMembersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer global={global} key={c.id} volunteer={c} refer={this} />
      });
    });

    this.setState({
      form,
      volunteers,
      teamOptions,
      membersOption,
      selectedTeamsOption,
      selectedMembersOption,
      loading: false
    });
  };

  render() {
    const { global, form } = this.state;

    if (!form || this.state.loading) {
      return <CircularProgress />;
    }

    return (
      <div>
        <div style={{ display: 'flex', padding: '10px' }}>
          <div style={{ padding: '5px 10px' }}>
            <Icon
              icon={faClipboard}
              style={{ width: 20, height: 20, color: 'gray' }}
            />{' '}
            {form.name}{' '}
            {this.props.edit ? (
              ''
            ) : (
              <Link to={'/forms/view/' + form.id}>view</Link>
            )}
          </div>
        </div>
        {this.props.edit ? <CardFormFull global={global} form={form} refer={this} /> : ''}
      </div>
    );
  }
}

export const CardFormFull = props => (
  <div>
    <div>
      <br />
      Teams assigned to this form:
      <Select
        value={props.refer.state.selectedTeamsOption}
        onChange={props.refer.handleTeamsChange}
        options={props.refer.state.teamOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Volunteers assigned directly to this form:
      <Select
        value={props.refer.state.selectedMembersOption}
        onChange={props.refer.handleMembersChange}
        options={props.refer.state.membersOption}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
  </div>
);
