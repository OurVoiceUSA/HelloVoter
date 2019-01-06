import React from 'react';
import { shallow } from 'enzyme';
import { MapSelect } from '../';

const DEFAULT_MAP_OPTION_1_VALUE = 'space';
const DEFAULT_MAP_OPTION_2_VALUE = 1;

describe('<MapSelect />', () => {
  it('renders without crashing', () => {
    shallow(<MapSelect />);
  });

  it('Renders a checkbox when checkbox prop is passed in.', () => {
    const select = shallow(<MapSelect checkbox />);
    const checkbox = select.find('.ck-bx').props();
    expect(checkbox.checked).toEqual(false);
  });

  it('When checkbox checked, it renders two dropdowns with default values.', () => {
    const select = shallow(<MapSelect checkbox />);
    const checkbox = select
      .find('.ck-bx')
      .at(0)
      .props();

    checkbox.onChange();
    expect(select.state().checked).toEqual(true);

    const mapOptions = select
      .find('.map-option-1')
      .at(0)
      .props();
    expect(mapOptions.children.props.value[0].value).toEqual(
      DEFAULT_MAP_OPTION_1_VALUE
    );

    const mapOptions2 = select
      .find('.map-option-2')
      .at(0)
      .props();
    expect(mapOptions2.children.props.value.value).toEqual(
      DEFAULT_MAP_OPTION_2_VALUE
    );
  });
});
