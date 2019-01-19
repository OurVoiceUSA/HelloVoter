import React from 'react';
import { PreviewItem } from './PreviewItem';
import './importPreview.css';

export const ImportPreview = ({ titles, records }) => (
  <React.Fragment>
    <h3>Sample Records based on selection</h3>
    <div style={{ display: 'flex' }}>
      <PreviewItem
        key={`${titles}${Math.random() * 10000}`}
        data={titles}
        title
      />
      {records.map(record => (
        <PreviewItem key={record} data={record} />
      ))}
    </div>
  </React.Fragment>
);
