import React, { Component } from 'react';

import CssBaseline from '@material-ui/core/CssBaseline';
import CircularProgress from '@material-ui/core/CircularProgress';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import withStyles from '@material-ui/core/styles/withStyles';

import styles from '../app.styles';

class Loading extends Component {

  constructor(props) {
    super(props);

    this.state = {
      classes: props.classes,
    };

  }

  render() {
    const { classes } = this.state;

    return (
      <main className={classes.main}>
        <CssBaseline />
        <Paper className={classes.paper}>
          <Typography component="h1" variant="h5">
            HelloVoterHQ is loading...
          </Typography>
          <CircularProgress height={15} />
        </Paper>
        <br />
        <center>Built with <span role="img" aria-label="Love">❤️</span> by Our Voice USA</center>
      </main>
    );
  }
}

export default withStyles(styles)(Loading);
