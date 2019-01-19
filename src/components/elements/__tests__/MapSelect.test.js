import React from 'react';
import { shallow } from 'enzyme';
import { MapSelect } from '../';
import {
  multiSelectChange,
  singleSelectChange,
  activateCheckBox,
  deactivateCheckBox,
  activateMapSelectChange,
  multiValue,
  singleValue,
  addSelectValue,
  findInnerElement,
  currentMapState,
  mockedOptionMap,
  uncheckedOptionMap
} from '../__mocks__/element_utilities';

describe('<MapSelect />', () => {
  it('renders without crashing', () => {
    shallow(<MapSelect />);
  });

  it('When checkbox checked, it renders two dropdowns.', () => {
    const select = shallow(<MapSelect checkbox />);
    const checkbox = findInnerElement(select, '.ck-bx');
    checkbox.onChange();
    findInnerElement(select, '.map-option-1');
    findInnerElement(select, '.map-option-2');
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
    expect(select.state().value).toEqual(singleValue);
  });

  it('Changes dropdown value when several options are selected', () => {
    const select = shallow(<MapSelect checkbox />);
    multiSelectChange(select);
    expect(select.state().value).toEqual(multiValue);
  });

  it('Correctly updates state as multi values are selected', () => {
    const select = shallow(<MapSelect checkbox />);
    const value1 = { label: 'Test', value: 'test' };
    const value2 = { label: 'Test 2', value: 'test2' };
    addSelectValue(select, value1);
    addSelectValue(select, value1, value2);
    expect(select.state().value).toEqual([value1, value2]);
  });

  it('Sends formatted data to callback passed in (updateFormats)', () => {
    const updateFormatsMock = jest.fn();
    const select = shallow(
      <MapSelect label="Test" updateFormats={updateFormatsMock} checkbox />
    );
    multiSelectChange(select);
    expect(updateFormatsMock).toHaveBeenCalledWith('Test', currentMapState);
  });

  it('Clears value and makes this.state.isMulti false when splitting on delimeter', () => {
    const select = shallow(<MapSelect checkbox />);
    multiSelectChange(select);
    activateCheckBox(select);
    expect(select.state().isMulti).toEqual(false);
    expect(select.state().checked).toEqual(true);
    expect(select.state().value).toEqual('');
  });

  it('Correctly sets value after new delimeter value is set', () => {
    const select = shallow(<MapSelect checkbox />);
    multiSelectChange(select);
    activateCheckBox(select);
    expect(select.state().isMulti).toEqual(false);
    expect(select.state().checked).toEqual(true);
    expect(select.state().value).toEqual('');
    singleSelectChange(select);
    expect(select.state().value).toEqual(singleValue);
  });

  it('Changes map dropdown 1 state value on change', () => {
    const select = shallow(<MapSelect checkbox />);
    activateCheckBox(select);
    activateMapSelectChange(select, '.map-option-1', 'space', 'map1');
    expect(select.state().map1).toEqual({ label: 'map1', value: 'space' });
  });

  it('Changes map dropdown 2 state value on change', () => {
    const select = shallow(<MapSelect checkbox />);
    activateCheckBox(select);
    activateMapSelectChange(select, '.map-option-2', 1, 'map2');
    expect(select.state().map2).toEqual({ label: 'map2', value: 1 });
  });

  it('Receives options from parent component, and populates the dropdown with them.', () => {
    const select = shallow(<MapSelect options={['test1', 'test2']} checkbox />);
    const mapSelect = findInnerElement(select, '.map-select-input');
    expect(mapSelect.options.length).toEqual(2);
  });

  it('removes value data when checkbox toggled', () => {
    const updateFormatsMock = jest.fn();
    const select = shallow(
      <MapSelect label="Test" updateFormats={updateFormatsMock} checkbox />
    );
    activateCheckBox(select);
    activateMapSelectChange(select, '.map-option-2', 1, 'map2');
    expect(updateFormatsMock).toHaveBeenCalledWith('Test', mockedOptionMap);

    deactivateCheckBox(select);
    expect(updateFormatsMock).toHaveBeenCalledWith('Test', uncheckedOptionMap);
  });
});
