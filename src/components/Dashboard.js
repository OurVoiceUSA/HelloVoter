import React, { Component } from 'react';

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
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

    this.setState({data: data, loading: false});
  }

  render() {
    if (this.state.loading) return (<div>loading</div>);

    return (
      <div>
        {JSON.stringify(this.state.data)}
      </div>
    );
  }
}

