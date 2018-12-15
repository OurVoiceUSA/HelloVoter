import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import t from 'tcomb-form';

import { RootLoader, CardForm, _loadForms } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      forms: [],
      thisForm: {},
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
              Form Name:
              <t.form.Form
                ref={(ref) => this.addFormForm = ref}
                type={this.formServerItems}
                options={this.formServerOptions}
                onChange={(e) => this.onChangeForm(e)}
                value={this.state.addFormForm}
              />

              <button onClick={() => this._createForm()}>
                Submit
              </button>
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
