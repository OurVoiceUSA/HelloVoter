import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';

import HomeScreen from '.';

it('HomeScreen renders correctly', () => {
  renderer.create(<HomeScreen />);
});
