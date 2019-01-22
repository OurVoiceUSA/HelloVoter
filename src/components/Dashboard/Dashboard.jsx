import React, { Component } from 'react';
import NumberFormat from 'react-number-format';
import filesize from 'filesize';

import './Dashboard.css';

import {
  faShieldAlt,
  faUser,
  faUsers,
  faMap,
  faClipboard,
  faChartPie,
  faMapMarkerAlt,
  faDatabase,
} from '@fortawesome/free-solid-svg-icons';
import { arrayMove, sortableContainer, sortableElement } from 'react-sortable-hoc';

import { _fetch, notify_error, RootLoader, Icon } from '../../common.js';

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      data: {},
      cards: [],
    };
  }

  componentDidMount() {
    this._loadData();
  }

  onSortEnd = ({oldIndex, newIndex}) => {
    this.setState(() => ({
      cards: arrayMove(this.state.cards, oldIndex, newIndex),
    }));
  }

  _loadData = async () => {
    let data = {};
    let cards = [];

    this.setState({ loading: true });

    try {
      data = await _fetch(this.props.server, '/volunteer/v1/dashboard');
      cards = [
        {
          name: 'Volunteers',
          stat: data.volunteers,
          icon: faUser,
        },
        {
          name: 'Teams',
          stat: data.teams,
          icon: faUsers,
        },
        {
          name: 'Turfs',
          stat: data.turfs,
          icon: faMap,
        },
        {
          name: 'Forms',
          stat: data.forms,
          icon: faClipboard,
        },
        {
          name: 'Questions',
          stat: data.questions,
          icon: faChartPie,
        },
        {
          name: 'Addresses',
          stat: 
          (
            <NumberFormat
              value={data.addresses}
              displayType={'text'}
              thousandSeparator={true}
            />
          ),
          icon: faMapMarkerAlt,
        },
        {
          name: 'Database size',
          stat: filesize(data.dbsize ? data.dbsize : 0, {
            round: 1,
          }),
          icon: faDatabase,
        },
      ];

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
        />
      </RootLoader>
    );
  }
}

const _Cards = props => {
  return <div className="dashboard-container">
    {
      props.cards.map((card, index) => 
        <CardDashboard
          name={card.name}
          stat={card.stat}
          icon={card.icon}
          index={index}
        />
      )
    }
  </div>;
};

const Cards = sortableContainer(_Cards);

const _CardDashboard = props => (
  <div style={{ display: 'flex', padding: '10px' }} className="dashboard-card">
    <div style={{ padding: '5px 10px' }}>
      <Icon
        style={{ width: 50, height: 50, color: 'gray' }}
        icon={props.icon ? props.icon : faShieldAlt}
      />
    </div>
    <div style={{ flex: 1, overflow: 'auto' }}>
      <h3>
        {props.name}: {props.stat}
      </h3>
    </div>
  </div>
);

const CardDashboard = sortableElement(_CardDashboard);
