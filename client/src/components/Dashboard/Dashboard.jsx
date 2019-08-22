import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import filesize from 'filesize';

import Modal from '@material-ui/core/Modal';

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
  _fetch,
  notify_error,
  RootLoader
} from '../../common.js';

import { Cards } from './Cards';

export default class App extends Component {
  constructor(props) {
    super(props);

    const dash = (localStorage.getItem('dash') || 'vol,team,turf,form,attributes,addr,dbsz').split(',');

    this.state = {
      global: props.global,
      loading: true,
      noAdmins: false,
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
    const { global } = this.state;

    let data = {};
    let cards = [];

    this.setState({ loading: true });

    try {
      data = await _fetch(global, '/dashboard');

      if (data.admins === 0) this.setState({noAdmins: true});

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
        attributes: {
          name: 'Attributes',
          stat: data.attributes,
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
    const { global } = this.state;

    return (
      <RootLoader flag={this.state.loading} func={this._loadData}>
        <Cards
          state={this.state}
          axis="xy"
          onSortEnd={this.onSortEnd}
          cards={this.state.cards}
          dash={this.state.dash}
        />

        <Modal
          aria-labelledby="simple-modal-title"
          aria-describedby="simple-modal-description"
          open={this.state.noAdmins}
          onClose={() => this.setState({ noAdmins: false })}
        >
          <div
            style={{
              position: 'absolute',
              top: 100,
              left: 200,
              right: 200,
              backgroundColor: 'white',
              padding: 40
            }}
          >
            Welcome! Looks like you're new here. By default, users have zero permissions
            when they sign in. To make yourself an admin and gain full access to the UI,
            run the follow command from the shell:
            <br />
            <br />
            <pre>npm run makeadmin -- {global.getUserProp("id")}</pre>
          </div>
        </Modal>
      </RootLoader>
    );
  }
}
