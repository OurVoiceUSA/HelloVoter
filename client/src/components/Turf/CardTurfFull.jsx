import React from 'react';
import Select from 'react-select';

export const CardTurfFull = props => (
  <div>
    <div>
      <pre>
      {JSON.stringify(props.refer.state.turf.stats, null, 2)}
      </pre>
      <br />
      Teams assigned to this turf:
      <Select
        value={props.refer.state.selectedTeamsOption}
        onChange={props.refer.handleTeamsChange}
        options={props.refer.state.teamOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Volunteers assigned directly to this turf:
      <Select
        value={props.refer.state.selectedMembersOption}
        onChange={props.refer.handleMembersChange}
        options={props.refer.state.membersOption}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
  </div>
);
