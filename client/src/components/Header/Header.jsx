import React from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import MenuIcon from '@material-ui/icons/Menu';
import Avatar from '@material-ui/core/Avatar';
import IconButton from '@material-ui/core/IconButton';
import classNames from 'classnames';

export const Header = ({
  classes,
  global,
  open,
  handleDrawerOpen,
  getUserProp
}) => (
  <AppBar
    position="absolute"
    className={classNames(classes.appBar, open && classes.appBarShift)}
  >
    <Toolbar disableGutters={!open} className={classes.toolbar}>
      <IconButton
        color="inherit"
        aria-label="Open drawer"
        onClick={handleDrawerOpen}
        className={classNames(
          classes.menuButton,
          open && classes.menuButtonHidden
        )}
      >
        <MenuIcon />
      </IconButton>
      <Typography
        component="h1"
        variant="h6"
        color="inherit"
        noWrap
        className={classes.title}
      >
        <div style={{ margin: 10 }}>HelloVoterHQ {(global.state.orgId?'Organization ID: '+global.state.orgId:'@ '+global.state.server)}</div>
      </Typography>
      <Avatar
        alt="Remy Sharp"
        src={getUserProp('avatar')}
        className={classes.avatar}
      />
    </Toolbar>
  </AppBar>
);

export default Header;
