import React, { Component } from 'react';

import { HashRouter as Router, Route } from 'react-router-dom';

import { RootLoader, CardForm, _loadForms } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      forms: [],
      thisForm: {},
    };

  }

  componentDidMount = async () => {
    this.setState({forms: await _loadForms(this)});
  }

  render() {
    return (
      <Router>
        <div>
          <Route exact={true} path="/forms/" render={() => (
            <RootLoader flag={this.state.loading} func={async () => this.setState({forms: await _loadForms(this)})}>
              {this.state.forms.map(f => (<CardForm key={f.id} form={f} refer={this} />))}
            </RootLoader>
          )} />
          <Route path="/forms/:id" render={(props) => (
            <CardForm key={this.state.thisForm.id} form={this.state.thisForm} refer={this} />
          )} />
        </div>
      </Router>
    );
  }
}
