import React  from 'react';
import { sortableElement } from 'react-sortable-hoc';
import { faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '../../common.js';

import './Dashboard.css';

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

export const CardDashboard = sortableElement(_CardDashboard);
