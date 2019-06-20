import React, { Component } from 'react';

import CircularProgress from '@material-ui/core/CircularProgress';

import {
  API_BASE_URI,
  _fetch,
  notify_error,
  Icon
} from '../common.js';

import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { faTwitter, faFacebook } from '@fortawesome/free-brands-svg-icons';

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      cb_version: null,
      neo4j_version: null,
    };
  }

  componentDidMount = async () => {
    let data = {};
    try {
      data = await _fetch(this.props.server, API_BASE_URI+'/dashboard');
    } catch (e) {
      notify_error(e, 'Unable to load dashboard info.');
    }

    this.setState({
      cb_version: data.version ? data.version : 'unknown',
      neo4j_version: data.neo4j_version ? data.neo4j_version : 'unknown',
    });
  };

  render() {
    return (
      <div>
        <div>
          {process.env.REACT_APP_NAME} version {process.env.REACT_APP_VERSION}
        </div>
        <div>
          {this.state.cb_version ? (
            'HelloVoterAPI version ' + this.state.cb_version
          ) : (
            <CircularProgress height={15} />
          )}
        </div>
        <div>
          {this.state.neo4j_version ? (
            'Neo4j version ' + this.state.neo4j_version
          ) : (
            <CircularProgress height={15} />
          )}
        </div>
        <div>
          &copy; 2018, Our Voice USA, a 501(c)(3) Non-Profit Organization. Not
          for any candidate or political party.
        </div>
        <div>
          This program is free software; refer to our{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/OurVoiceUSA/HelloVoterHQ/blob/master/LICENSE"
          >
            License
          </a>{' '}
          for more details.
        </div>
        <div>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://twitter.com/OurVoiceUSA"
          >
            <Icon icon={faTwitter} /> @OurVoiceUSA
          </a>
        </div>
        <div>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.facebook.com/OurVoiceUsa"
          >
            <Icon icon={faFacebook} /> @OurVoiceUSA
          </a>
        </div>
        <div>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://ourvoiceusa.org/"
          >
            <Icon icon={faGlobe} /> ourvoiceusa.org
          </a>
        </div>
      </div>
    );
  }
}
