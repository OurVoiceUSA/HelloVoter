import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';

import SmLoginPage from '.';

it('SmLogin renders correctly', () => {
  renderer.create(<SmLoginPage />);
});
