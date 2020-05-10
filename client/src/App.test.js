import React from 'react';
import { mount } from 'enzyme';
import { expect } from 'chai';

import App from './App';

describe('App', () => {
  it('App renders', () => {
    const wrapper = mount(<App />);
  });
});
