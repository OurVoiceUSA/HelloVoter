import React, { Component } from 'react';

import Loader from 'react-loader-spinner';

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
      let res = await fetch('https://'+this.props.server+'/canvass/v1/dashboard', {
        headers: {
          'Authorization': 'Bearer '+(this.props.jwt?this.props.jwt:"of the one ring"),
          'Content-Type': 'application/json',
        },
      });

      data = await res.json();
    } catch (e) {
      console.warn(e);
    }

    this.setState({cb_version: data.version});
  }
//      <div>{(this.state.cb_version?'canvass-broker version '+this.state.cb_version:<Loader />)}</div>

  render() {
    return (
      <div>
        <div>{process.env.REACT_APP_NAME} version {process.env.REACT_APP_VERSION}</div>
        <div>{(this.state.cb_version?'canvass-broker version '+this.state.cb_version:<Loader height={15} type="ThreeDots" />)}</div>
        <div>&copy; 2018, Our Voice USA, a 501(c)(3) Non-Profit Organization. Not for any candidate or political party.</div>
        <div>This program is free software; refer to our <a target="_blank" href="https://github.com/OurVoiceUSA/HelloVoter/blob/master/LICENSE">License</a> for more details.</div>
      </div>
    );
  }
}
