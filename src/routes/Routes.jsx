import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import Volunteers from '../components/Volunteers';
import Teams from '../components/Teams';
import Turf from '../components/Turf';
import Forms from '../components/Forms';
import Map from '../components/Map';
import ImportData from '../components/ImportData';
import Analytics from '../components/Analytics';
import Settings from '../components/Settings';
import Jwt from '../components/Jwt';
import About from '../components/About';
import NoMatch from './NoMatch';

// <Routes />
/*
  Props
  {
    server: <server description>
  }
*/
export const Routes = ({ server, refer }) => (
  <Switch>
    <Route exact={true} path="/" render={() => <Dashboard server={server} />} />
    <Route path="/volunteers/" render={() => <Volunteers server={server} />} />
    <Route path="/teams/" render={() => <Teams server={server} />} />
    <Route path="/turf/" render={() => <Turf server={server} />} />
    <Route path="/forms/" render={() => <Forms server={server} />} />
    <Route
      path="/map/"
      render={() => <Map server={server} apiKey={this.state.google_maps_key} />}
    />
    <Route path="/import/" render={() => <ImportData server={server} />} />
    <Route path="/analytics/" render={() => <Analytics server={server} />} />
    <Route path="/settings/" render={() => <Settings server={server} />} />
    <Route path="/jwt/" render={props => <Jwt {...props} refer={refer} />} />
    <Route path="/about/" render={() => <About server={server} />} />
    <Route component={NoMatch} />
  </Switch>
);

export default Routes;
