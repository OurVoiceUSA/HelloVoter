import React from 'react';
import classNames from 'classnames';
import Drawer from '@material-ui/core/Drawer';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import MenuItems from './MenuItems';

export const Sidebar = ({
  classes,
  open,
  assignments,
  experimental,
  handleClickLogout,
  handleDrawerClose
}) => (
  <Drawer
    variant="permanent"
    classes={{
      paper: classNames(classes.drawerPaper, !open && classes.drawerPaperClose)
    }}
    open={open}
  >
    <div className={classes.toolbarIcon}>
      <IconButton onClick={handleDrawerClose}>
        <ChevronLeftIcon />
      </IconButton>
    </div>
    <Divider />
    <MenuItems assignments={assignments} handleClickLogout={handleClickLogout} experimental={experimental} />
  </Drawer>
);

export default Sidebar;
