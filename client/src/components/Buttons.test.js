import React from 'react';
import { shallow, mount } from 'enzyme';
import { Text } from 'react-native';
import { expect } from 'chai';

import { Button } from './Buttons';

describe('Buttons', () => {
  it('Button renders without link', () => {
    const wrapper = mount(<Button title="foo" />);
    expect(wrapper.props().title).to.equal('foo');
    expect(wrapper.find('Link')).to.have.lengthOf(0);
  });

  // can't render without the router
  it.skip('Button renders with link', () => {
    const wrapper = mount(<Button to="/foo" />);
    expect(wrapper.props().title).to.equal(undefined);
    expect(wrapper.find('Link')).to.have.lengthOf(1);
  });

  it('Button renders with children', () => {
    const wrapper = mount(<Button><Text>HELLO</Text></Button>);
    expect(wrapper.props().title).to.equal(undefined);
    expect(wrapper.props().children.props.children).to.equal('HELLO');
  });
});
