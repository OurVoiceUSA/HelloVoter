import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';

const LogoutDialog = ({ menuLogout, handleCloseLogout, _logout }) => (
  <Dialog
    open={menuLogout}
    onClose={handleCloseLogout}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
  >
    <DialogTitle id="alert-dialog-title">
      Are you sure you wish to logout?
    </DialogTitle>
    <DialogActions>
      <Button onClick={handleCloseLogout} color="primary" autoFocus>
        No
      </Button>
      <Button onClick={() => _logout()} color="primary">
        Yes
      </Button>
    </DialogActions>
  </Dialog>
);

export default LogoutDialog;
