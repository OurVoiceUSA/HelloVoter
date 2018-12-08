import React, { Component } from 'react';
import './App.css';

import t from 'tcomb-form';

var Form = t.form.Form;

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {};

    this.formServerItems = t.struct({
      server: t.String,
      ack: t.subtype(t.Boolean, function (s) { return s }), // boolean that fails validation if not selected
    });

    this.formServerOptions = {
      fields: {
        server: {
          label: 'Server Domain Name',
          help: 'Enter the domain name of the server you wish to connect to.',
          error: 'You must enter a domain name.',
        },
        ack: {
          label: 'Terms of Use',
          help: 'By checking this you acknowledge that the server to which you are connecting is not affiliated with Our Voice USA and the data you send and receive is governed by that server\'s terms of use.',
          error: 'You must acknowledge the terms of use.',
        },
      },
    };

    this.onChange = this.onChange.bind(this);
    this.doSave = this.doSave.bind(this);

  }

  onChange(connectForm) {
    this.setState({connectForm})
  }

  doSave = async () => {

    let json = this.refs.mainForm.getValue();
    if (json === null) return;

console.warn("hi there: "+JSON.stringify(this.state.connectForm));

    if (json.ack !== true) {
      // need to correctly trigger this.formServerOptions.fields.ack.hasError
      console.warn("FOOBAR")
      return;
    }

    this.setState({serverLoading: true});

//    let ret = await this.singHello(json.server);

//    if (ret.flag !== true) Alert.alert((ret.error?'Error':'Connection Successful'), ret.msg, [{text: 'OK'}], { cancelable: false });
//    if (ret.error !== true) server = null;

  }

  render() {
    return (
      <div className="App">
        <header className="App-header">

          <Form
            ref="mainForm"
            type={this.formServerItems}
            options={this.formServerOptions}
            onChange={this.onChange}
            value={this.state.connectForm}
          />

          <button onClick={this.doSave}>
            Connect to Server
          </button>

        </header>
      </div>
    );
  }
}

export default App;
