import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import filesize from 'filesize';

import {
  faUser,
  faUsers,
  faMap,
  faClipboard,
  faChartPie,
  faMapMarkerAlt,
  faDatabase,
} from '@fortawesome/free-solid-svg-icons';

import { arrayMove } from 'react-sortable-hoc';

import {
  API_BASE_URI,
  _fetch,
  notify_error,
  RootLoader
} from '../../common.js';

import { Cards } from './Cards';

export default class App extends Component {
  constructor(props) {
    super(props);

    const dash = (localStorage.getItem('dash') || 'vol,team,turf,form,ques,addr,dbsz').split(',');

    this.state = {
      loading: true,
      data: {},
      cards: [],
      dash,
    };
  }

  componentDidMount() {
    this._loadData();
  }

  onSortEnd = ({ oldIndex, newIndex }) => {
    const dash = arrayMove(this.state.dash, oldIndex, newIndex);
    localStorage.setItem('dash', dash.map(n => n));
    this.setState(() => ({
      dash,
    }));
  }

  _loadData = async () => {
    let data = {};
    let cards = [];

    this.setState({ loading: true });

    try {
      data = await _fetch(this.props.server, API_BASE_URI+'/dashboard');
      cards = {
        vol: {
          name: 'Volunteers',
          stat: data.volunteers,
          icon: faUser,
        },
        team: {
          name: 'Teams',
          stat: data.teams,
          icon: faUsers,
        },
        turf: {
          name: 'Turfs',
          stat: data.turfs,
          icon: faMap,
        },
        form: {
          name: 'Forms',
          stat: data.forms,
          icon: faClipboard,
        },
        ques: {
          name: 'Questions',
          stat: data.questions,
          icon: faChartPie,
        },
        addr: {
          name: 'Addresses',
          stat: (
            <NumberFormat
              value={data.addresses}
              displayType={'text'}
              thousandSeparator={true}
            />
          ),
          icon: faMapMarkerAlt,
        },
        dbsz: {
          name: 'Database size',
          stat: filesize(data.dbsize ? data.dbsize : 0, {
            round: 1,
          }),
          icon: faDatabase,
        },
      };
    } catch (e) {
      notify_error(e, 'Unable to load dashboard info.');
    }

    this.setState({ cards, data, loading: false });
  }

  render() {
    return (
      <RootLoader flag={this.state.loading} func={this._loadData}>
        <Cards
          state={this.state}
          axis="xy"
          onSortEnd={this.onSortEnd}
          cards={this.state.cards}
          dash={this.state.dash}
        />
      </RootLoader>
    );
  }
}
