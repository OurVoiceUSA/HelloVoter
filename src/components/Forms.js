import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import Modal from 'react-modal';
import t from 'tcomb-form';

import { faTimesCircle, faPlusCircle, faClipboard } from '@fortawesome/free-solid-svg-icons';

import { CardCanvasser } from './Canvassers.js';
import { CardTeam } from './Teams.js';

import {
  _fetch, notify_error, notify_success, _loadForms, _loadForm, _loadCanvassers, _loadTeams, _handleSelectChange,
  RootLoader, Icon, Loader,
} from '../common.js';

Modal.setAppElement(document.getElementById('root'));

const customStyles = {
  content : {
    top                   : '15%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
};

const FTYPE = t.enums({
  'String': 'Text Input',
  'TEXTBOX': 'Large Text Box',
  'Number': 'Number',
  'Boolean': 'On/Off Switch',
  'SAND': 'Agree/Disagree',
//  'List': 'Select from List',
}, 'FTYPE');

var addItem = {
  key: t.String,
  label: t.String,
  type: FTYPE,
};

var options = {
  fields: {
    key: {
      label: 'Input Key',
      help: 'The spreadsheet column name.',
    },
    label: {
      label: 'Input Label',
      help: 'Label the user sees on the form.',
    },
    type: {
      help: 'The type of input the user can enter.',
    },
  },
};

var premade = {
  'FullName': { label: 'Full Name', type: 'String', optional: true },
  'Phone': { label: 'Phone Number', type: 'Number', optional: true },
  'Email': { label: 'Email Address', type: 'String', optional: true },
  'RegisteredToVote': { label: 'Are you registered to vote?', type: 'Boolean', optional: true },
  'PartyAffiliation': { label: 'Party Affiliation', type: 'List', optional: true,
    options: [
      'No Party Preference',
      'Democratic',
      'Republican',
      'Green',
      'Libertarian',
      'Other',
    ]},
};

export default class App extends Component {

  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('formsperpage');
    if (!perPage) perPage = 5;

    // TODO: this is only for brand new forms
    let fields = JSON.parse(JSON.stringify(premade)); // deep copy
    let order = Object.keys(fields);
    this.mainForm = t.struct({
      'name': t.String,
    });

    this.state = {
      loading: true,
      forms: [],
      fields: fields,
      order: order,
      customForm: null,
      search: "",
      perPage: perPage,
      pageNum: 1,
    };

    this.formServerItems = t.struct({
      name: t.String,
    });

    this.customFormItems = t.struct(addItem);

    this.formServerOptions = {
      fields: {
        name: {
          label: 'Form Name',
          error: 'You must enter a form name.',
        },
      },
    };

    this.onChange = this.onChange.bind(this);
    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.doAddCustom = this.doAddCustom.bind(this);
    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  handlePageNumChange(obj) {
    localStorage.setItem('canvassersperpage', obj.value);
    this.setState({pageNum: 1, perPage: obj.value});
  }

  handlePageClick = (data) => {
    this.setState({pageNum: data.selected+1});
  }

  onTypeSearch (event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1,
    })
  }

  openModal() {
    this.setState({customForm: t.struct(addItem)})
  }

  closeModal() {
    this.setState({customForm: null});
  }

  doAddCustom() {
    let { fields, order } = this.state;

    let ref = this.customForm.getValue();
    if (ref === null) return;
    let json = JSON.parse(JSON.stringify(ref)); // deep copy

    let key = json.key;
    delete json.key;
    json.optional = true; // backwards compatability

    // check for duplicate keys
    if (fields[key]) {
      //return Alert.alert('Error', 'Duplicate Input Key. Change your Input Key to add this item.', [{text: 'OK'}], { cancelable: false });    }
      notify_error({}, "Duplicate entry.");
      return;
    }

    fields[key] = json;
    order[order.length] = key;

    this.setState({customForm: null, fields: fields, order: order});

  }

  doShowCustom() {
    this.setState({customForm: t.struct(addItem)});
  }

  inputTypeToReadable(type) {
    switch (type) {
      case 'String': return 'Text Input';
      case 'TEXTBOX': return 'Text Box';
      case 'Number': return 'Number';
      case 'Boolean': return 'On/Off Switch';
      case 'SAND': return 'Agree/Disagree';
      case 'List': return 'Select from List';
      default: return type;
    }
  }

  rmField(obj) {
    let { fields, order } = this.state;
    for (let f in fields) {
      if (fields[f] === obj) {
        delete fields[f];
        order.splice(order.indexOf(f), 1);
      }
    }
    this.setState({fields, order});
    this.forceUpdate();
  }

  onChange(value) {
    if (value.type === 'List') value = t.String; // do something...
  }

  onChangeForm(addFormForm) {
    this.setState({addFormForm})
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    this.setState({loading: true});
    let forms = [];

    try {
      forms = await _loadForms(this);
    } catch (e) {
      notify_error(e, "Unable to load forms.");
    }
    this.setState({forms, loading: false});
  }

  _deleteForm = async (id) => {
    try {
      await _fetch(this.props.server, '/canvass/v1/form/delete', 'POST', {formId: id});
    } catch (e) {
      notify_error(e, "Unable to delete form.");
    }

    window.location.href = "/HelloVoter/#/forms/";
    this._loadData();
    notify_success("Form has been deleted.");
  }

  _createForm = async () => {
    let json = this.addFormForm.getValue();
    if (json === null) return;

    this.setState({saving: true});

    // get rid of ending whitespace
    let formName = json.name.trim();

    // disallow anything other than alphanumeric and a few other chars
    if (!formName.match(/^[a-zA-Z0-9\-_ ]+$/)) {
      notify_error({}, "From name can only contain alphanumeric characters, and spaces and dashes.");
      return;
    }

    // max length
    if (formName.length > 255) {
      notify_error({}, "Form name cannot be longer than 255 characters.");
      return;
    }

    // make sure this name doesn't exist
    try {

      let obj;

      obj = {
        name: formName,
        questions: this.state.fields,
        questions_order: this.state.order,
      };

      await _fetch(this.props.server, '/canvass/v1/form/create', 'POST', obj);
      notify_success("Form has been created.")
    } catch (e) {
      notify_error(e, "Unable to create form.");
    }
    this.setState({saving: false});

    window.location.href = "/HelloVoter/#/forms/";
    this._loadData();
  }

  render() {
    let list = [];

    this.state.forms.forEach(f => {
      if (this.state.search && !f.name.toLowerCase().includes(this.state.search)) return;
      list.push(f);
    });

    return (
      <Router>
        <div>
          <Route exact={true} path="/forms/" render={() => (
            <RootLoader flag={this.state.loading} func={() => this._loadData()}>
              Search: <input type="text" value={this.state.value} onChange={this.onTypeSearch} data-tip="Search by name, email, location, or admin" />
              <br />
              <ListForms forms={list} refer={this} />
              <Link to={'/forms/add'}><button>Add Form</button></Link>
            </RootLoader>
          )} />
          <Route path="/forms/add" render={(props) => (
            <div>
              <t.form.Form
                ref={(ref) => this.addFormForm = ref}
                type={this.formServerItems}
                options={this.formServerOptions}
                onChange={(e) => this.onChangeForm(e)}
                value={this.state.addFormForm}
              />

              <div style={{margin: 25}}>Items in your Canvassing form: <button onClick={this.openModal}><Icon icon={faPlusCircle} /> Add Item</button></div>

              {Object.keys(this.state.fields).map((f) => {
                let field = this.state.fields[f];
                return (
                  <li key={f} style={{marginLeft: 25}}>{field.label+(field.required?' *':'')} : {this.inputTypeToReadable(field.type)} <Icon icon={faTimesCircle} color="red" /></li>
                );
              })}

              {this.state.saving?
              <Loader />
              :
              <button style={{margin: 25}} onClick={() => this._createForm()}>
                Create Form
              </button>
              }

              <Modal
                isOpen={(this.state.customForm !== null)}
                onAfterOpen={this.afterOpenModal}
                onRequestClose={this.closeModal}
                style={customStyles}
                contentLabel="Add item to form"
              >
              <t.form.Form
                ref={(ref) => this.customForm = ref}
                type={this.customFormItems}
                options={options}
                onChange={this.onChange}
                value={this.state.customForm}
              />
                <button onClick={this.doAddCustom}>Add this item</button>
                &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
                <button onClick={() => this.setState({customForm: null})}>Dismiss</button>
              </Modal>
            </div>
          )} />
          <Route path="/forms/view/:id" render={(props) => (
            <div>
              <CardForm key={props.match.params.id} id={props.match.params.id} edit={true} refer={this} />
              <br />
              <br />
              <br />
              <button onClick={() => this._deleteForm(props.match.params.id)}>Delete Form</button>
            </div>
          )} />
        </div>
      </Router>
    );
  }
}

const ListForms = (props) => {
  const perPage = props.refer.state.perPage;
  let paginate = (<div></div>);
  let list = [];

  props.forms.forEach((f, idx) => {
    let tp = Math.floor(idx/perPage)+1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardForm key={f.id} form={f} refer={props.refer} />);
  });

  paginate = (
    <div style={{display: 'flex'}}>
      <ReactPaginate previousLabel={"previous"}
        nextLabel={"next"}
        breakLabel={"..."}
        breakClassName={"break-me"}
        pageCount={props.forms.length/perPage}
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
      <h3>{props.type}Forms ({props.forms.length})</h3>
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
      server: this.props.refer.props.server,
      form: this.props.form,
      selectedTeamsOption: [],
      selectedMembersOption: [],
    };
  }

  componentDidMount() {
    if (!this.state.form) this._loadData();
  }

  handleTeamsChange = async (selectedTeamsOption) => {
    try {
      let obj = _handleSelectChange(this.state.selectedTeamsOption, selectedTeamsOption);

      for (let i in obj.add) {
        await _fetch(this.state.server, '/canvass/v1/form/assigned/team/add', 'POST', {teamId: obj.add[i], formId: this.props.id});
      }

      for (let i in obj.rm) {
        await _fetch(this.state.server, '/canvass/v1/form/assigned/team/remove', 'POST', {teamId: obj.rm[i], formId: this.props.id});
      }

      notify_success("Team assignments saved.");
      this.setState({ selectedTeamsOption });
    } catch (e) {
      notify_error(e, "Unable to add/remove teams.");
    }
  }

  handleMembersChange = async (selectedMembersOption) => {
    try {
      let obj = _handleSelectChange(this.state.selectedMembersOption, selectedMembersOption);

      for (let i in obj.add) {
        await _fetch(this.state.server, '/canvass/v1/form/assigned/canvasser/add', 'POST', {cId: obj.add[i], formId: this.props.id});
      }

      for (let i in obj.rm) {
        await _fetch(this.state.server, '/canvass/v1/form/assigned/canvasser/remove', 'POST', {cId: obj.rm[i], formId: this.props.id});
      }

      notify_success("Canvasser assignments saved.");
      this.setState({ selectedMembersOption });
    } catch (e) {
      notify_error(e, "Unable to add/remove teams.");
    }
  }

  _loadData = async () => {
    let form = {};

    this.setState({loading: true})

    try {
       form = await _loadForm(this, this.props.id, true);
    } catch (e) {
      notify_error(e, "Unable to load form info.");
      return;
    }

    let canvassers = await _loadCanvassers(this.props.refer);
    let members = await _loadCanvassers(this.props.refer, 'form', this.props.id);
    let teams = await _loadTeams(this.props.refer);
    let teamsSelected = await _loadTeams(this.props.refer, 'form', this.props.id);

    let teamOptions = [];
    let membersOption = [];
    let selectedTeamsOption = [];
    let selectedMembersOption = [];

    teams.forEach((t) => {
      teamOptions.push({value: t.id, id: t.id, label: (
        <CardTeam key={t.id} team={t} refer={this} />
      )});
    });

    teamsSelected.forEach((t) => {
      selectedTeamsOption.push({value: t.id, id: t.id, label: (<CardTeam key={t.id} team={t} refer={this} />)});
    })

    canvassers.forEach((c) => {
      membersOption.push({value: c.id, id: c.id, label: (<CardCanvasser key={c.id} canvasser={c} refer={this} />)});
    });

    members.forEach((c) => {
      selectedMembersOption.push({value: c.id, id: c.id, label: (<CardCanvasser key={c.id} canvasser={c} refer={this} />)});
    });

    this.setState({form, canvassers, teamOptions, membersOption, selectedTeamsOption, selectedMembersOption, loading: false});
  }

  render() {
    const { form } = this.state;

    if (!form || this.state.loading) {
      return (<Loader />);
    }

    return (
      <div>
        <div style={{display: 'flex', padding: '10px'}}>
          <div style={{padding: '5px 10px'}}>
            <Icon icon={faClipboard} style={{width: 50, height: 50, color: "gray"}} /> {form.name} {(this.props.edit?'':(<Link to={'/forms/view/'+form.id}>view</Link>))}
          </div>
        </div>
        {this.props.edit?<CardFormFull form={form} refer={this} />:''}
      </div>
    );
  }
}

export const CardFormFull = (props) => (
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
      Canvassers assigned directly to this form:
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
