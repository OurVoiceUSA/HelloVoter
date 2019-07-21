import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import DashboardIcon from '@material-ui/icons/Dashboard';
import PersonIcon from '@material-ui/icons/Person';
import PeopleIcon from '@material-ui/icons/People';
import MapIcon from '@material-ui/icons/Map';
import AssignmentIcon from '@material-ui/icons/Assignment';
import PaperclipIcon from '@material-ui/icons/AttachFile';
import NavigationIcon from '@material-ui/icons/Navigation';
import PresentToAllIcon from '@material-ui/icons/PresentToAll';
import WorkIcon from '@material-ui/icons/Work';
import BarChartIcon from '@material-ui/icons/BarChart';
//import SettingsIcon from '@material-ui/icons/Settings';
import IndeterminateCheckBoxIcon from '@material-ui/icons/IndeterminateCheckBox';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import HelpIcon from '@material-ui/icons/Help';

const MenuItems = ({ handleClickLogout }) => (
  <Fragment>
    <List>
      <Link to={'/'}>
        <ListItem button>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
      </Link>
      <Link to={'/volunteers/'}>
        <ListItem button>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="Volunteers" />
        </ListItem>
      </Link>
      <Link to={'/teams/'}>
        <ListItem button>
          <ListItemIcon>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText primary="Teams" />
        </ListItem>
      </Link>
      <Link to={'/turf/'}>
        <ListItem button>
          <ListItemIcon>
            <MapIcon />
          </ListItemIcon>
          <ListItemText primary="Turf" />
        </ListItem>
      </Link>
      <Link to={'/forms/'}>
        <ListItem button>
          <ListItemIcon>
            <AssignmentIcon />
          </ListItemIcon>
          <ListItemText primary="Forms" />
        </ListItem>
      </Link>
      <Link to={'/attributes/'}>
        <ListItem button>
          <ListItemIcon>
            <PaperclipIcon />
          </ListItemIcon>
          <ListItemText primary="Attributes" />
        </ListItem>
      </Link>
      <Link to={'/map/'}>
        <ListItem button>
          <ListItemIcon>
            <NavigationIcon />
          </ListItemIcon>
          <ListItemText primary="Map" />
        </ListItem>
      </Link>
      <Link to={'/import/'}>
        <ListItem button>
          <ListItemIcon>
            <PresentToAllIcon />
          </ListItemIcon>
          <ListItemText primary="Import Data" />
        </ListItem>
      </Link>
      <Link to={'/queue/'}>
        <ListItem button>
          <ListItemIcon>
            <WorkIcon />
          </ListItemIcon>
          <ListItemText primary="System Queue" />
        </ListItem>
      </Link>
      <Link to={'/analytics/'}>
        <ListItem button>
          <ListItemIcon>
            <BarChartIcon />
          </ListItemIcon>
          <ListItemText primary="Analytics" />
        </ListItem>
      </Link>
{/*
      <Link to={'/settings/'}>
        <ListItem button>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </Link>
*/}
    </List>
    <Divider />
    <List>
      <ListItem button onClick={handleClickLogout}>
        <ListItemIcon>
          <IndeterminateCheckBoxIcon />
        </ListItemIcon>
        <ListItemText primary="Logout" />
      </ListItem>
    </List>
    <Divider />
    <List>
      <Link to={'/about/'}>
        <ListItem button>
          <ListItemIcon>
            <AccountBalanceIcon />
          </ListItemIcon>
          <ListItemText primary="About" />
        </ListItem>
      </Link>
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://github.com/OurVoiceUSA/HelloVoterHQ/tree/master/docs/"
      >
        <ListItem button>
          <ListItemIcon>
            <HelpIcon />
          </ListItemIcon>
          <ListItemText primary="Help" />
        </ListItem>
      </a>
    </List>
  </Fragment>
);

export default MenuItems;
