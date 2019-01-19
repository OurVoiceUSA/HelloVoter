import React from 'react';
import { Route, Switch } from 'react-router-dom';
import {
  Dashboard,
  Volunteers,
  Teams,
  Turf,
  Forms,
  Map,
  ImportData,
  Analytics,
  Settings,
  Jwt,
  About
} from '../components';
import NoMatch from './NoMatch';

// <Routes />
/*
  Props
  {
    server: <server description>
  }
*/
export const Routes = ({ server, refer, google_maps_key }) => (
  <Switch>
    <Route exact={true} path="/" render={() => <Dashboard server={server} />} />
    <Route path="/volunteers/" render={() => <Volunteers server={server} />} />
    <Route path="/teams/" render={() => <Teams server={server} />} />
    <Route path="/turf/" render={() => <Turf server={server} />} />
    <Route path="/forms/" render={() => <Forms server={server} />} />
    <Route
      path="/map/"
      render={() => <Map server={server} apiKey={google_maps_key} />}
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
