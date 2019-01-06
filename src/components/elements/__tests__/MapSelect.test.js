import React from 'react';
import { shallow } from 'enzyme';
import { MapSelect } from '../';

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

    select
      .find('.map-option-1')
      .at(0)
      .props();

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

  // ADD ON CHANGE HANDLER FOR MAIN DROPDOWN
  it('Changes dropdown value when new option is selected', () => {
    const select = shallow(<MapSelect isMulti={false} checkbox />);
    select
      .find('.map-select-input')
      .at(0)
      .simulate('change', { target: { value: 'firstName' } });
    expect(select.state().value).toEqual('firstName');
  });
  // ADD MULTI VALUE CHANGE HANDLING VIA DROPDOWN
  it('Changes dropdown value when several options are selected', () => {
    const select = shallow(<MapSelect checkbox />);
    select
      .find('.map-select-input')
      .at(0)
      .simulate('change', {
        target: {
          value: [
            { label: 'First Name', value: 'firstName' },
            { label: 'Middle Name', value: 'middleName' },
            { label: 'Last Name', value: 'lastName' }
          ]
        }
      });
    expect(select.state().value).toEqual('firstName middleName lastName');
  });

  // SEND FORMATTED DATA VIA CALLBACK
  it('Sends formatted data to callback passed in', () => {
    const getReturnedMock = jest.fn();
    shallow(<MapSelect getReturned={getReturnedMock} checkbox />);
    expect(getReturnedMock).toHaveBeenCalledWith(
      'firstName middleName lastName'
    );
  });

  // TODO :

  // MAP DROPDOWN SELECT HANDLING
  it('Changes map dropdown 1 state value on change', () => {
    const select = shallow(<MapSelect checkbox />);
    select
      .find('.ck-bx')
      .at(0)
      .props()
      .onChange();

    select
      .find('.map-option-1')
      .at(0)
      .simulate('change', { target: { value: 'space' } });

    expect(select.state().map1).toEqual('space');
  });

  it('Changes map dropdown 2 state value on change', () => {
    const select = shallow(<MapSelect checkbox />);
    select
      .find('.ck-bx')
      .at(0)
      .props()
      .onChange();

    select
      .find('.map-option-2')
      .at(0)
      .simulate('change', { target: { value: 1 } });

    expect(select.state().map2).toEqual(1);
  });

  // COMMA DELIMETED CAN ONLY HAVE 1 SELECT VALUE
});
