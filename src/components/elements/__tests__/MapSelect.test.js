import React from 'react';
import { shallow } from 'enzyme';
import { MapSelect } from '../';
import {
  multiSelectChange,
  singleSelectChange,
  activateCheckBox,
  activateMapSelectChange
} from './utilities';

describe('<MapSelect />', () => {
  it('renders without crashing', () => {
    shallow(<MapSelect />);
  });

  it('When checkbox checked, it renders two dropdowns.', () => {
    const select = shallow(<MapSelect checkbox />);
    const checkbox = select
      .find('.ck-bx')
      .at(0)
      .props();

    checkbox.onChange();

    // finding checkbox 1, if not there test fails
    select
      .find('.map-option-1')
      .at(0)
      .props();

    // finding checkbox 2, if not there test fails
    select
      .find('.map-option-2')
      .at(0)
      .props();

    expect(select.state().checked).toEqual(true);
  });

  it('Renders a checkbox when checkbox prop is passed in.', () => {
    const select = shallow(<MapSelect checkbox />);
    const checkbox = select.find('.ck-bx').props();
    expect(checkbox.checked).toEqual(false);
  });

  it('Changes dropdown value when new option is selected', () => {
    const select = shallow(<MapSelect isMulti={false} checkbox />);
    singleSelectChange(select);
    expect(select.state().value).toEqual('firstName');
  });

  it('Changes dropdown value when several options are selected', () => {
    const select = shallow(<MapSelect checkbox />);
    multiSelectChange(select);
    expect(select.state().value).toEqual('firstName middleName lastName');
  });

  it('Sends formatted data to callback passed in', () => {
    const sendFormatMock = jest.fn();
    const select = shallow(<MapSelect sendFormat={sendFormatMock} checkbox />);
    multiSelectChange(select);
    expect(sendFormatMock).toHaveBeenCalledWith(
      'firstName middleName lastName'
    );
  });

  it('Clears value and makes this.state.isMulti false when splitting on delimeter', () => {
    const select = shallow(<MapSelect checkbox />);
    multiSelectChange(select);
    activateCheckBox(select);
    expect(select.state().isMulti).toEqual(false);
    expect(select.state().checked).toEqual(true);
    expect(select.state().value).toEqual('');
  });

  it('Changes map dropdown 1 state value on change', () => {
    const select = shallow(<MapSelect checkbox />);
    activateCheckBox(select);
    activateMapSelectChange(select, '.map-option-1', 'space');
    expect(select.state().map1).toEqual('space');
  });

  it('Changes map dropdown 2 state value on change', () => {
    const select = shallow(<MapSelect checkbox />);
    activateCheckBox(select);
    activateMapSelectChange(select, '.map-option-2', 1);
    expect(select.state().map2).toEqual(1);
  });
});
