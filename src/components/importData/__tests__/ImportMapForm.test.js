import React from 'react';
import { shallow, mount } from 'enzyme';
import { ImportMapForm } from '..';
import { findInnerElement } from '../utilities';

describe('<ImportMapper />', () => {
  it('renders without crashing', () => {
    shallow(<ImportMapForm />);
  });

  it('takes options array an populates mapSelects option values', () => {
    const mapper = mount(<ImportMapForm options={['test1', 'test2']} />);
    const select = findInnerElement(mapper, '.map-select-input');
    expect(select.options.length).toEqual(2);
  });
});
