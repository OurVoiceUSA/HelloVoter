import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Check } from '@material-ui/icons';
import './progressbar.css';

const styles = {
  root: {
    flexGrow: 1,
  },
};

const ProgressBar = ({ title, completed }) => (
  <div
    className={`progress-bar progress-bar-${
      completed === 0 ? 'hidden' : 'shown'
    }`}
  >
    {completed === true ? (
      <div className="progress-complete">
        <Check />
        Complete
      </div>
    ) : (
      <React.Fragment>
        <h3 style={{ marginTop: '5px' }}>{title}</h3>
        <LinearProgress
          style={{ width: '90%', paddingTop: '10px' }}
          variant="determinate"
          value={completed}
        />
      </React.Fragment>
    )}
  </div>
);

export default withStyles(styles)(ProgressBar);
