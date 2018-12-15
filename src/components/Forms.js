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
      modalIsOpen: false,
    };

    this.formServerItems = t.struct({
      name: t.String,
    });

    this.formServerOptions = {
      fields: {
        name: {
          label: 'Form Name',
          error: 'You must enter a form name.',
        },
      },
    };

    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
  }


  openModal() {
    this.setState({modalIsOpen: true});
  }

  closeModal() {
    this.setState({modalIsOpen: false});
  }

  doAddCustom() {
    let { fields, order } = this.state;

    let ref = this.refs.customForm.getValue();
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

  doSave = async () => {
    let { fields, order, edit, form, refer, user, dbx } = this.state;

    this.setState({saving: true});
    let msg = null;

    let json = this.refs.mainForm.getValue();
    if (edit === false && json === null) msg = 'Please name this form.';
    else {

      let formName;

      if (edit === false) {
        // get rid of ending whitespace
        formName = json.name.trim();

        // disallow anything other than alphanumeric and a few other chars
        if (!formName.match(/^[a-zA-Z0-9\-_ ]+$/)) msg = 'From name can only contain alphanumeric characters, and spaces and dashes.';

        // max length
        if (formName.length > 255) msg = 'Form name cannot be longer than 255 characters.';
      } else {
        formName = form.name;
      }

      let forms = [];

      // make sure this name doesn't exist as a dropbox folder
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
          author: (user.dropbox ? user.dropbox.name.display_name : 'You'),
          author_id: ( user.dropbox ? user.dropbox.account_id : id ),
          version: 1,
          questions: fields,
          questions_order: order,
        };

        if (edit === true) {
          obj.id = form.id;
          obj.created = form.created;
          obj.name = form.name;
        }

        if (edit === false && dbx) {
          let res = await dbx.filesListFolder({path: ''});
          for (let i in res.entries) {
            let item = res.entries[i];
            if (item['.tag'] != 'folder') continue;
            let name = item.path_display.substr(1).toLowerCase();
            if (name == obj.name.toLowerCase())
              msg = 'Dropbox folder name '+name+' already exists. Please choose a different name.';
          }
        }

        try {
          // fetch POST save form
        } catch (e) {
          console.warn(""+e);
          msg = "Unable to save form data.";
        }

      } catch (error) {
        console.warn("err: "+error);
        msg = 'Unable to save form, an unknown error occurred.';
      }
    }

    if (msg === null) {
      refer.setState({SelectModeScreen: false})
      refer._loadForms();
      this.props.navigation.goBack();
    } else {
      //Alert.alert('Error', msg, [{text: 'OK'}], { cancelable: false });
      console.warn("Error");
    }

    this.setState({saving: false});
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
    let json = this.addFormForm.getValue();
    if (json === null) return;

    this.setState({saving: true});

    try {
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
    let { name, form, customForm, fields, order, saving } = this.state;

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
                  <li style={{marginLeft: 25}}>{field.label+(field.required?' *':'')} : {this.inputTypeToReadable(field.type)} <Icon icon={faTimesCircle} color="red" /></li>
                );
              })}

              <button style={{margin: 25}} onClick={() => this._createForm()}>
                Create Form
              </button>

              <Modal
                isOpen={this.state.modalIsOpen}
                onAfterOpen={this.afterOpenModal}
                onRequestClose={this.closeModal}
                style={customStyles}
                contentLabel="Example Modal"
              >
                Add item form goes here
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
