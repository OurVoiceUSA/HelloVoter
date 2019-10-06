import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';

import glob from 'glob';

import HomeScreen from '../src/components/HomeScreenPage';

//import App from '../src/App';
// skipping due to StackNavigator causing issue on import
it.skip('App renders correctly', () => {
  renderer.create(<App />);
});

// TODO: get __mocks__ to work from glob
it('HomeScreen renders correctly', () => {
  renderer.create(<HomeScreen />);
});

// run all component tests
glob
  .sync('../src/**/*.test.js', { cwd: `${__dirname}/` })
  .map(filename => require(`./${filename}`))
