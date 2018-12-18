import React, { Component } from 'react';

import Loader from 'react-loader-spinner';

import { _fetch, Icon } from '../common.js';

import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { faTwitter, faFacebook } from '@fortawesome/free-brands-svg-icons';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      cb_version: null,
    };
  }

  componentDidMount = async () => {
    let data = {};
    try {
      let res = await _fetch(this.props.server, '/canvass/v1/dashboard');

      data = await res.json();
    } catch (e) {
      console.warn(e);
    }

    this.setState({cb_version: (data.version?data.version:'unknown')});
  }

  render() {
    return (
      <div>
        <div>{process.env.REACT_APP_NAME} version {process.env.REACT_APP_VERSION}</div>
        <div>{(this.state.cb_version?'canvass-broker version '+this.state.cb_version:<Loader height={15} type="ThreeDots" />)}</div>
        <div>&copy; 2018, Our Voice USA, a 501(c)(3) Non-Profit Organization. Not for any candidate or political party.</div>
        <div>This program is free software; refer to our <a target="_blank" rel="noopener noreferrer" href="https://github.com/OurVoiceUSA/HelloVoter/blob/master/LICENSE">License</a> for more details.</div>
        <div><a target="_blank" rel="noopener noreferrer" href="https://twitter.com/OurVoiceUSA"><Icon icon={faTwitter} /> @OurVoiceUSA</a></div>
        <div><a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/OurVoiceUsa"><Icon icon={faFacebook} /> @OurVoiceUSA</a></div>
        <div><a target="_blank" rel="noopener noreferrer" href="https://ourvoiceusa.org/"><Icon icon={faGlobe} /> ourvoiceusa.org</a></div>
      </div>
    );
  }
}
