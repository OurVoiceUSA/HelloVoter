import React from 'react';

export const PreviewItem = ({ data, title }) => (
  <div className="records-wrapper">
    {data.map(item => (
      <div
        className={`preview-item  ${title ? ' preview-title' : ''}`}
        key={`${item}${Math.random() * 3444}`}
      >
        <div style={{ width: 250 }}>{item !== '' ? item : 'NULL'}</div>
      </div>
    ))}
  </div>
);
