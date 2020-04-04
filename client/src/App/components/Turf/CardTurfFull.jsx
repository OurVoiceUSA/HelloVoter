import React from 'react';
import Select from 'react-select';

import { PaperTable } from '../Elements';

export const CardTurfFull = props => (
  <div>
    <div>
      Volunteers assigned to this turf:
      <Select
        value={props.refer.state.selectedMembersOption}
        onChange={props.refer.handleMembersChange}
        options={props.refer.state.membersOption}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      <h3>Turf Stats</h3>
      <pre>{JSON.stringify(props.refer.state.turf.stats)}</pre>
      <PaperTable
        spec={[
          {
            header: 'Query Name',
            tooltip: 'Constraints which define this attribute query.',
            params: ['Name'],
          },
          {
            header: 'Total Addresses',
            tooltip: 'Total number of houses/buildings in this area.',
            params: ['Total Addresses'],
          },
          {
            header: 'Total People',
            tooltip: 'Total number of people in this area.',
            params: ['Total People'],
          },
          {
            header: 'Total People Visited',
            tooltip: 'Total number of people in this area who have been visited.',
            params: ['Total People Visited'],
          },
          {
            header: 'People Visited in past month',
            tooltip: 'Total number of peple in this area who have been visited.',
            params: ['People Visited in past month'],
          },
        ]}
        rows={
          Object.keys(props.refer.state.turf.stats["Stats by Attribute"]).map(k => {
            props.refer.state.turf.stats["Stats by Attribute"][k]['Name'] = k;
            return props.refer.state.turf.stats["Stats by Attribute"][k];
          })
        }
      />
    </div>
  </div>
);
