import React from 'react';
import { PreviewItem } from './PreviewItem';
import './importPreview.css';

function createRandomKey() {
  return parseInt(Math.random() * 1000);
}

export const ImportPreview = ({ titles, records }) => (
  <React.Fragment>
    <h3>Sample Records based on selection</h3>
    <div key={`${titles}${records}`} style={{ display: 'flex' }}>
      <PreviewItem key={`${titles}${createRandomKey()}`} data={titles} title />
      {records.map(record => (
        <PreviewItem key={`${record}${createRandomKey()}`} data={record} />
      ))}
    </div>
  </React.Fragment>
);
