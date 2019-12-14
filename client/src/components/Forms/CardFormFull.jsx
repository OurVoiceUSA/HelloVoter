import React from 'react';
import Select from 'react-select';

import { FormEditor } from '.';

export const CardFormFull = props => (
  <div>
    <div>
      <br />
      Teams assigned to this form:
      <Select
        value={props.refer.state.selectedTeamsOption}
        onChange={props.refer.handleTeamsChange}
        options={props.refer.state.teamOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Volunteers assigned directly to this form:
      <Select
        value={props.refer.state.selectedMembersOption}
        onChange={props.refer.handleMembersChange}
        options={props.refer.state.membersOption}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
    <br />
    <FormEditor
      onChange={props.refer.handleAttributeChange}
      attributes={props.attributes} selected={props.selected}
    />
  </div>
);
