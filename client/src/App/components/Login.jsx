import React, { Component } from 'react';

import Loading from './Loading';

import Select from 'react-select';

import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import LockIcon from '@material-ui/icons/LockOutlined';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import withStyles from '@material-ui/core/styles/withStyles';

import styles from '../app.styles';

class Login extends Component {

  constructor(props) {
    super(props);

    let loginOptions = [];
    if (!process.env.REACT_APP_NO_AUTH) loginOptions = [{label: 'Organization ID', value: 'org'}, {label: '3rd Party Server', value: 'server'}];
    if (process.env.NODE_ENV === 'development') loginOptions.unshift({label: 'LOCAL DEVELOPMENT', value: 'dev'});

    let token;

    try {
      if (this.props.location.pathname.match(/\/jwt\//)) {
        token = this.props.location.pathname.split('/').pop();
      }
    } catch(e) {
      console.warn(e);
    }

    this.state = {
      global: props.global,
      dev: (process.env.NODE_ENV === 'development'), // default to true if development
      classes: props.classes,
      token: token,
      selectedLoginOption: loginOptions[0],
      loginOptions: loginOptions,
    };

  }

  componentDidMount() {
    const { token } = this.state;

    if (token) {
      localStorage.setItem('jwt', token);
      setTimeout(() => {window.location.href = '/HelloVoterHQ/#/'}, 500);
      setTimeout(() => {window.location.reload()}, 1500);
    }
  }

  render() {
    const { global, classes, token, loginOptions, selectedLoginOption } = this.state;

    if (token) return (<Loading classes={classes} />);

    return (
      <main className={classes.main}>
        <CssBaseline />
        <Paper className={classes.paper}>
          <Avatar className={classes.avatar}>
            <LockIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in to HelloVoterHQ
          </Typography>
          <form className={classes.form} onSubmit={(e) => { e.preventDefault(); global.doSave(e, this.state.target); }} >
            <Select
              value={selectedLoginOption}
              options={loginOptions}
              onChange={selectedLoginOption => this.setState({selectedLoginOption})}
            />
            <center>
              <br />
              &nbsp; || &nbsp;
              <a target="_blank" rel="noopener noreferrer" href="https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/master/docs/Privacy-Policy.md">Privacy Policy</a>
              &nbsp; || &nbsp;
              <a target="_blank" rel="noopener noreferrer" href="https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/master/docs/Terms-of-Service.md">Terms of Service</a>
              &nbsp; || &nbsp;
            </center>
            <LoginOption global={global} refer={this} />
            {(process.env.REACT_APP_NO_AUTH)&&
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              className={classes.submit}
              onClick={() => this.setState({target: 'none'})}
            >
              Sign In
            </Button>
            ||
            <div>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                className={classes.submit}
                onClick={() => this.setState({target: 'google'})}
              >
                Google Sign In
              </Button>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="secondary"
                onClick={() => this.setState({target: 'facebook'})}
                className={classes.submit}
              >
                Facebook Sign In
              </Button>
            </div>
            }
          </form>
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

const LoginOption = props => {
  switch (props.refer.state.selectedLoginOption.value) {
    case 'org':
      return (
        <div>
          <FormControl margin="normal" required fullWidth>
            <InputLabel htmlFor="domain">Enter your Organization ID. Example: NCC1701</InputLabel>
            <Input id="orgId" name="orgId" autoComplete="orgId" autoFocus defaultValue={props.global.state.orgId} />
          </FormControl>
          <FormControlLabel
            control={<Checkbox value="ack" color="primary" required />}
            label="By checking this box you acknowledge that you have read and agreed to our Terms of Service."
          />
        </div>
      );
    case 'server':
      return (
        <div>
          <FormControl margin="normal" required fullWidth>
            <InputLabel htmlFor="domain">Server Address</InputLabel>
            <Input id="server" name="server" autoComplete="server" autoFocus defaultValue={props.global.state.qserver} />
          </FormControl>
          <FormControlLabel
            control={<Checkbox value="ack" color="primary" required />}
            label="By checking this box you acknowledge that the server to which you are connecting is not affiliated with Our Voice USA and the data you send and receive is governed by that server's Terms of Service."
          />
        </div>
      );
    default:
      return null;
  }
}

export default withStyles(styles)(Login);
