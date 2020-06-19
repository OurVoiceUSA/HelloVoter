import React, { Component } from 'react';
import { PlaidLink } from 'react-plaid-link';
import Select from 'react-select';

import CssBaseline from '@material-ui/core/CssBaseline';
import Paper from '@material-ui/core/Paper';
import withStyles from '@material-ui/core/styles/withStyles';

import styles from '../app.styles';
import {
  notify_error,
  notify_success,
  _fetch,
} from '../common.js';

class Payout extends Component {

  constructor(props) {
    super(props);
    this.state = {
      classes: props.classes,
      global: props.global
    };
  }

  onSuccess = async (token, metadata) => {
    const { global } = this.state;
    try {
      // send token to server
      await _fetch(global, '/payout/account/token/exchange', 'POST', {
        token,
        account_id: metadata.account.id,
      });
      notify_success('Linked account');
    } catch (e) {
      notify_error(e, 'Unable to link account.');
    }
  };

  render() {
    const { classes } = this.state;

    return (
      <main className={classes.main}>
        <CssBaseline />
        <Paper className={classes.paper}>
          <PlaidLink
            clientName="HelloVoter"
            env="sandbox"
            product={['auth']}
            publicKey="5b621e7055950cc12bf86303026a6a"
            onSuccess={this.onSuccess}
          >
            Connect a bank account
          </PlaidLink>
        </Paper>
        <br />
        <center>
          Built with <span role="img" aria-label="Love">❤️</span> by Our Voice USA
          <p />
          Not for any candidate or political party.
          <p />
          Copyright (c) 2020, Our Voice USA. All rights reserved.
          <p />
          This program is free software; you can redistribute it and/or
          modify it under the terms of the GNU Affero General Public License
          as published by the Free Software Foundation; either version 3
          of the License, or (at your option) any later version.
        </center>
      </main>
    );
  }
}

export default withStyles(styles)(Payout);
