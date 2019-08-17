import React from 'react';
import { sortableContainer } from 'react-sortable-hoc';
import { CardDashboard } from './CardDashboard';

import './Dashboard.css';

const _Cards = props => {
  return (
    <div className="dashboard-container">
      {props.dash.map((item, index) => {
        const card = props.cards[item] || {};
        return (
          <CardDashboard
            key={card.name}
            name={card.name}
            stat={card.stat}
            icon={card.icon}
            index={index}
          />
        );
      })}
    </div>
  );
};

export const Cards = sortableContainer(_Cards);
