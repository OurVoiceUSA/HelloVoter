import React from 'react';
import Select from 'react-select';

import { FormEditor } from '.';

export const CardFormFull = props => (
  <div>
    <div>
      <br />
      Volunteers assigned to this form:
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
    <p>
    NOTE: After any changes here, users will see these updates the next time they enter the map
    </p>
    <FormEditor
      onChange={props.refer.handleAttributeChange}
      attributes={props.attributes} selected={props.selected}
    />
  </div>
);
