import React from 'react';
import { shallow } from 'enzyme';
import { ImportData } from '..';
import {
  testHeaders1,
  testBody1,
  formatObject1,
  testHeaders2,
  testBody2,
  formatObject2
} from '../__mocks__';
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

    mapper.instance().updateMapped();

    expect(mapper.state().mapped[0]).toEqual([
      '',
      'HAYDEE ACEVEDO',
      'CANAL ST',
      'ELLENVILLE',
      'NY',
      '12428',
      '',
      ''
    ]);
  });

  it('uses format stored in state, to format excel file to new mapping of comma delimeted single-value dropdowns.', () => {
    const mapper = shallow(<ImportData />);
    mapper.setState({
      data: testBody2,
      headers: testHeaders2,
      formats: formatObject2
    });

    mapper.instance().updateMapped();

    expect(mapper.state().mapped[0]).toEqual([
      '',
      'HAYDEE ACEVEDO',
      'CANAL ST',
      '',
      '',
      '12428',
      '1234',
      '5677'
    ]);
  });
});
