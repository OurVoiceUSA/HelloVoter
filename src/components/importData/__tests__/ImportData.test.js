import React from 'react';
import { shallow } from 'enzyme';
import { ImportData } from '..';
import { testHeaders1, testBody1, formatObject1 } from '../__mocks__';
// import { findInnerElement } from '../__mocks__/utilities';

describe('<ImportMapper />', () => {
  it('renders without crashing', () => {
    shallow(<ImportData />);
  });

  it('uses format stored in state, to format excel file to new mapping.', () => {
    const mapper = shallow(<ImportData />);
    mapper.setState({
      data: testBody1,
      headers: testHeaders1,
      formats: formatObject1
    });

    expect(mapper.state().mapped[0]).toEqual(['foo', 'bar', 'test']);
  });
});
