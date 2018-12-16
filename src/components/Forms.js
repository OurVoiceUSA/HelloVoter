import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import Modal from 'react-modal';
import t from 'tcomb-form';
import uuid from 'uuid';

import { faTimesCircle, faPlusCircle } from '@fortawesome/free-solid-svg-icons';

import { RootLoader, CardForm, Icon, _loadForms } from '../common.js';

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

    // TODO: this is only for brand new forms
    let fields = JSON.parse(JSON.stringify(premade)); // deep copy
    let order = Object.keys(fields);
    this.mainForm = t.struct({
      'name': t.String,
    });

    this.state = {
      loading: true,
      forms: [],
      thisForm: {},
      fields: fields,
      order: order,
      customForm: null,
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
      console.warn("Duplicate");
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
    }
    return type;
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
    if (value.type == 'List') value = t.String; // do something...
  }

  onChangeForm(addFormForm) {
    this.setState({addFormForm})
  }

  componentDidMount() {
    this._loadForms();
  }

  _loadForms = async () => {
    this.setState({forms: await _loadForms(this)});
  }

  _createForm = async () => {
    const { fields, order, edit, form } = this.state;

    let json = this.addFormForm.getValue();
    if (json === null) return;
    let TformName = json.name;

    this.setState({saving: true});

    this.setState({saving: true});
    let msg = null;

    json = this.customForm.getValue();
    json.name = TformName;

    // get rid of ending whitespace
    let formName = json.name.trim();

    // disallow anything other than alphanumeric and a few other chars
    if (!formName.match(/^[a-zA-Z0-9\-_ ]+$/)) msg = 'From name can only contain alphanumeric characters, and spaces and dashes.';

    // max length
    if (formName.length > 255) msg = 'Form name cannot be longer than 255 characters.';

    // make sure this name doesn't exist
    try {

      let epoch = Math.floor(new Date().getTime());
      let id = uuid();

      let obj;

      obj = {
        id: id,
        created: epoch,
        updated: epoch,
        name: formName,
        geofence: this.state.geofence,
        geofencename: this.state.geofencename,
        author: 'You',
        author_id: 'You',
        version: 1,
        questions: fields,
        questions_order: order,
      };

      try {
        // fetch POST save form
      } catch (e) {
        console.warn(""+e);
        msg = "Unable to save form data.";
      }

      fetch('https://'+this.props.server+'/canvass/v1/form/create', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: json.name,
        }),
      });
    } catch (e) {
      console.warn(e);
    }

    this.setState({saving: false});

    window.location.href = "/HelloVoter/#/forms/";
    this._loadForms();
  }

  render() {
    let { name, form, fields, order, saving } = this.state;

    return (
      <Router>
        <div>
          <Route exact={true} path="/forms/" render={() => (
            <RootLoader flag={this.state.loading} func={() => this._loadForms()}>
              {this.state.forms.map(f => (<CardForm key={f.id} form={f} refer={this} />))}
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

              {Object.keys(fields).map((f) => {
                let field = fields[f];
                return (
                  <li key={f} style={{marginLeft: 25}}>{field.label+(field.required?' *':'')} : {this.inputTypeToReadable(field.type)} <Icon icon={faTimesCircle} color="red" /></li>
                );
              })}

              <button style={{margin: 25}} onClick={() => this._createForm()}>
                Create Form
              </button>

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
          <Route path="/forms/edit/:id" render={(props) => (
            <CardForm key={this.state.thisForm.id} form={this.state.thisForm} refer={this} />
          )} />
        </div>
      </Router>
    );
  }
}
