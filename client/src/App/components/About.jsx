import React, { Component } from 'react';

import CircularProgress from '@material-ui/core/CircularProgress';

import {
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
      global: props.global,
      api_version: null,
      neo4j_version: null,
    };
  }

  componentDidMount = async () => {
    const { global } = this.state;

    let data = {};
    try {
      data = await _fetch(global, '/dashboard');
    } catch (e) {
      notify_error(e, 'Unable to load dashboard info.');
    }

    this.setState({
      api_version: data.version ? data.version : 'unknown',
      neo4j_version: data.neo4j_version ? data.neo4j_version : 'unknown',
    });
  };

  render() {
    const { api_version, neo4j_version } = this.state;

    return (
      <div>
        <div>
          {process.env.REACT_APP_NAME} version {process.env.REACT_APP_VERSION}
        </div>
        <div>
          {api_version ? (
            'HelloVoterAPI version ' + api_version
          ) : (
            <CircularProgress height={15} />
          )}
        </div>
        <div>
          {neo4j_version ? (
            'Neo4j version ' + neo4j_version
          ) : (
            <CircularProgress height={15} />
          )}
        </div>
        {(api_version && api_version !== "unknown" && api_version !== process.env.REACT_APP_VERSION)&&
        <h3 style={{color: "red"}}>WARNING: API version doesn't match HQ version.</h3>
        }
        <div>
          &copy; 2020, Our Voice USA, a 501(c)(3) Non-Profit Organization. Not
          for any candidate or political party.
        </div>
        <div>
          This program is free software; refer to our{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/OurVoiceUSA/HelloVoter/blob/master/LICENSE"
          >
            License
          </a>{' '}
          for more details.
        </div>
        <div>
          <a target="_blank" rel="noopener noreferrer" href="https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/master/docs/Privacy-Policy.md">Privacy Policy</a>
          ||
          <a target="_blank" rel="noopener noreferrer" href="https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/master/docs/Terms-of-Service.md">Terms of Service</a>
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
