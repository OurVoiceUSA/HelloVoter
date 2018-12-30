import React, { Component } from 'react';

import { HashRouter as Router, Route, Link, Switch } from 'react-router-dom';
import {NotificationContainer} from 'react-notifications';
import 'react-notifications/lib/notifications.css';
import jwt_decode from 'jwt-decode';
import queryString from 'query-string';
import ReactTooltip from 'react-tooltip';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Volunteers from './components/Volunteers';
import Teams from './components/Teams';
import Turf from './components/Turf';
import Forms from './components/Forms';
import Map from './components/Map';
import ImportData from './components/ImportData';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Jwt from './components/Jwt';
import About from './components/About';

import 'typeface-roboto';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';

import DashboardIcon from '@material-ui/icons/Dashboard';
import PersonIcon from '@material-ui/icons/Person';
import PeopleIcon from '@material-ui/icons/People';
import MapIcon from '@material-ui/icons/Map';
import AssignmentIcon from '@material-ui/icons/Assignment';
import NavigationIcon from '@material-ui/icons/Navigation';
import PresentToAllIcon from '@material-ui/icons/PresentToAll';
import BarChartIcon from '@material-ui/icons/BarChart';
import SettingsIcon from '@material-ui/icons/Settings';
import IndeterminateCheckBoxIcon from '@material-ui/icons/IndeterminateCheckBox';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import HelpIcon from '@material-ui/icons/Help';

import { _fetch, notify_error } from './common.js';

const drawerWidth = 175;

const styles = theme => ({
  root: {
    display: 'flex',
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  toolbarIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  avatar: {
    margin: 10,
  },
  menuButton: {
    marginLeft: 12,
    marginRight: 36,
  },
  menuButtonHidden: {
    display: 'none',
  },
  title: {
    flexGrow: 1,
  },
  drawerPaper: {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaperClose: {
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing.unit * 7,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing.unit * 9,
    },
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    padding: theme.spacing.unit * 3,
    height: '100vh',
    overflow: 'auto',
  },
  chartContainer: {
    marginLeft: -22,
  },
  tableContainer: {
    height: 320,
  },
  h5: {
    marginBottom: theme.spacing.unit * 2,
  },
});

class App extends Component {

  constructor(props) {
    super(props);

    const v = queryString.parse(window.location.search);

    this.state = {
      open: true,
      menuLogout: false,
      server: {},
      qserver: v.server,
    };

    this.onChange = this.onChange.bind(this);
    this.doSave = this.doSave.bind(this);

    // warn non-devs about the danger of the console
    if (process.env.NODE_ENV !== 'development')
      console.log("%cWARNING: This is a developer console! If you were told to open this and copy/paste something, and you are not a javascript developer, it is a scam and entering info here could give them access to your account!", "background: red; color: yellow; font-size: 45px");
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async (jwt) => {
    if (jwt)
      localStorage.setItem('jwt', jwt);

    this.setState({
      server: {
        hostname: localStorage.getItem('server'),
        jwt: (jwt?jwt:localStorage.getItem('jwt')),
      },
    });

    // don't load if no jwt
    if (jwt) this._loadKeys();
  }

  _loadKeys = async () => {
    // don't load if already loaded
    if (this.state.google_maps_key) return;

    let res = await _fetch(this.state.server, '/volunteer/v1/google_maps_key');
    let data = await res.json();

    // load google places API
    var aScript = document.createElement('script');
    aScript.type = 'text/javascript';
    aScript.src = "https://maps.googleapis.com/maps/api/js?key="+data.google_maps_key+"&libraries=places";
    document.head.appendChild(aScript);

    this.setState({google_maps_key: data.google_maps_key});
  }

  handleClickLogout = () => {
    this.setState({ menuLogout: true });
  };

  handleCloseLogout = () => {
    this.setState({ menuLogout: false });
  };

  onChange(connectForm) {
    this.setState({connectForm})
  }

  getUserProp(prop) {
    let item;

    if (!this.state.server.jwt) return null;

    try {
      item = jwt_decode(this.state.server.jwt)[prop];
    } catch (e) {
      notify_error(e, "Holy crap this error should never happen!! Better dust off that résumé...");
      console.warn(e);
    }
    return item;
  }

  _logout() {
    localStorage.removeItem('server');
    localStorage.removeItem('jwt');
    this.setState({server: {}});
  }

  doSave = async (event) => {
    await this.singHello(event.target.server.value);
  }

  singHello = async (server) => {
    let res;

    localStorage.setItem('server', server);

    try {
      res = await fetch('https://'+server+'/volunteer/v1/hello', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+(this.state.server.jwt?this.state.server.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({longitude: -118, latitude: 40}),
      });

      let sm_oauth_url = res.headers.get('x-sm-oauth-url');

      if (!sm_oauth_url) return {error: true, msg: "Missing required header."}

      switch (res.status) {
        case 200:
          break; // valid - break to proceed
        case 400:
          return {error: true, msg: "The server didn't understand the request sent from this device."};
        case 401:
          window.location.href = sm_oauth_url+"/gm?app=HelloVoter";
          return {error: false, flag: true};
        case 403:
          return {error: true, msg: "We're sorry, but your request to volunteer with this server has been rejected."};
        default:
          return {error: true, msg: "Unknown error connecting to server."};
      }

      let body = await res.json();

      if (body.data.ready !== true) return {error: false, msg: "The server said: "+body.msg};
      else {
        // TODO: use form data from body.data.forms[0] and save it in the forms_local cache
        // TODO: if there's more than one form in body.data.forms - don't navigate
        console.warn({server: server, dbx: null, user: this.state.user});
        return {error: false, flag: true};
      }
    } catch (e) {
      console.warn("singHello: "+e);
      return {error: true, msg: "Unable to make a connection to target server"};
    }

  }

  handleDrawerOpen = () => {
    this.setState({ open: true });
  };

  handleDrawerClose = () => {
    this.setState({ open: false });
  };

  render() {
    const { classes } = this.props;
    let { server } = this.state;

    if (!server.hostname)
      return (<Login refer={this} />);

    return (
      <Router>
        <div className={classes.root}>
          <ReactTooltip />
          <CssBaseline />
          <AppBar
            position="absolute"
            className={classNames(classes.appBar, this.state.open && classes.appBarShift)}
          >
            <Toolbar disableGutters={!this.state.open} className={classes.toolbar}>
              <IconButton
                color="inherit"
                aria-label="Open drawer"
                onClick={this.handleDrawerOpen}
                className={classNames(
                  classes.menuButton,
                  this.state.open && classes.menuButtonHidden,
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
                <div style={{margin: 10}}>HelloVoter @ {server.hostname}</div>
              </Typography>
              <Avatar alt="Remy Sharp" src={this.getUserProp('avatar')} className={classes.avatar} />
              {this.getUserProp('name')}
            </Toolbar>
          </AppBar>
          <Drawer
            variant="permanent"
            classes={{
              paper: classNames(classes.drawerPaper, !this.state.open && classes.drawerPaperClose),
            }}
            open={this.state.open}
          >
            <div className={classes.toolbarIcon}>
              <IconButton onClick={this.handleDrawerClose}>
                <ChevronLeftIcon />
              </IconButton>
            </div>
            <Divider />
            <List>
                <Link to={'/'}>
                  <ListItem button>
                      <ListItemIcon><DashboardIcon /></ListItemIcon>
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
                <Link to={'/analytics/'}>
                  <ListItem button>
                    <ListItemIcon>
                      <BarChartIcon />
                    </ListItemIcon>
                    <ListItemText primary="Analytics" />
                  </ListItem>
                </Link>
                <Link to={'/settings/'}>
                  <ListItem button>
                    <ListItemIcon>
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItem>
                </Link>
              </List>
              <Divider />
              <List>
                <ListItem button onClick={this.handleClickLogout}>
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
              <a target="_blank" rel="noopener noreferrer" href="https://github.com/OurVoiceUSA/HelloVoter/tree/mast
  er/docs/">
                <ListItem button>
                  <ListItemIcon>
                    <HelpIcon />
                  </ListItemIcon>
                  <ListItemText primary="Help" />
                </ListItem>
              </a>
            </List>
          </Drawer>
          <main className={classes.content}>
            <div className={classes.appBarSpacer} />
            <NotificationContainer/>
            <Switch>
              <Route exact={true} path="/" render={() => <Dashboard server={server} />} />
              <Route path="/volunteers/" render={() => <Volunteers server={server} />} />
              <Route path="/teams/" render={() => <Teams server={server} />} />
              <Route path="/turf/" render={() => <Turf server={server} />} />
              <Route path="/forms/" render={() => <Forms server={server} />} />
              <Route path="/map/" render={() => <Map server={server} apiKey={this.state.google_maps_key} />} />
              <Route path="/import/" render={() => <ImportData server={server} />} />
              <Route path="/analytics/" render={() => <Analytics server={server} />} />
              <Route path="/settings/" render={() => <Settings server={server} />} />
              <Route path="/jwt/" render={(props) => <Jwt {...props} refer={this} />} />
              <Route path="/about/" render={() => <About server={server} />} />
              <Route component={NoMatch} />
            </Switch>
            <Dialog
              open={this.state.menuLogout}
              onClose={this.handleCloseLogout}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="alert-dialog-title">Are you sure you wish to logout?</DialogTitle>
              <DialogActions>
                <Button onClick={this.handleCloseLogout} color="primary" autoFocus>
                  No
                </Button>
                <Button onClick={() => this._logout()} color="primary">
                  Yes
                </Button>
              </DialogActions>
            </Dialog>
          </main>
        </div>
      </Router>
    );
  }
}

const NoMatch = ({ location }) => (
  <div>
    <h1>OOOPS!!</h1>
    <div>
      We can't seem to find the page you're looking for:
      <br /><br />
      <code>{location.pathname}</code>
      <br /><br />
      If you feel this page is in error, <a target="_blank" rel="noopener noreferrer" href="https://github.com/OurVoiceUSA/HelloVoter/issues/new">
      report an issue</a> and the coders will take a look.
    </div>
  </div>
);

export default withStyles(styles)(App);
