import React from 'react';
import { shallow, mount } from 'enzyme';
import { ImportMap } from '..';
import { fields } from '../constants';
import { findInnerElement } from '../__mocks__';
import {
  testHeaders1,
  testBody1,
  formatObject1,
  testHeaders2,
  testBody2,
  formatObject2,
  testHeaders3,
  testBody3,
  formatObject3
} from '../__mocks__';

describe('<ImportMap />', () => {
  it('renders without crashing', () => {
    shallow(<ImportMap />);
  });

  it('takes options array an populates mapSelects option values', () => {
    const mapper = mount(
      <ImportMap fields={fields} headers={['test1', 'test2']} />
    );
    const select = findInnerElement(mapper, '.map-select-input');
    expect(select.options.length).toEqual(2);
  });

  it('takes options array an populates mapSelects option in the correct format', () => {
    const mapper = mount(
      <ImportMap fields={fields} headers={['test1', 'test2']} />
    );
    const select = findInnerElement(mapper, '.map-select-input');
    expect(select.options[0]).toEqual({ label: 'test1', value: 'test1' });
  });

  it('uses format stored in state, to format excel file to new mapping.', () => {
    const mapper = shallow(<ImportMap fields={fields} />);
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
      '',
      'ELLENVILLE',
      'NY',
      '12428',
      '',
      ''
    ]);
  });

  it('uses format stored in state, to format excel file to new mapping of comma delimeted single-value dropdowns.', () => {
    const mapper = shallow(<ImportMap fields={fields} />);
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
      '',
      '12428',
      '1234',
      '5677'
    ]);
  });

  it('uses format stored in state, to format excel file to new mapping of space  delimeted single-value dropdowns.', () => {
    const mapper = shallow(<ImportMap fields={fields} />);
    mapper.setState({
      data: testBody3,
      headers: testHeaders3,
      formats: formatObject3
    });

    mapper.instance().updateMapped();

    expect(mapper.state().mapped[0]).toEqual([
      '',
      'HAYDEE ACEVEDO',
      'CANAL ST',
      '',
      '',
      '',
      '12428',
      '1234',
      '5677'
    ]);
  });
});
