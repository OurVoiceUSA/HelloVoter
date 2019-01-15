import React from 'react';
import { shallow, mount } from 'enzyme';
import { ImportMapForm } from '..';
import { findInnerElement } from '../__mocks__/utilities';

describe('<ImportMapper />', () => {
  it('renders without crashing', () => {
    shallow(<ImportMapForm />);
  });

  it('takes options array an populates mapSelects option values', () => {
    const mapper = mount(<ImportMapForm headers={['test1', 'test2']} />);
    const select = findInnerElement(mapper, '.map-select-input');
    expect(select.options.length).toEqual(2);
  });

  it('takes options array an populates mapSelects option in the correct format', () => {
    const mapper = mount(<ImportMapForm headers={['test1', 'test2']} />);
    const select = findInnerElement(mapper, '.map-select-input');
    expect(select.options[0]).toEqual({ label: 'test1', value: 'test1' });
  });
});
