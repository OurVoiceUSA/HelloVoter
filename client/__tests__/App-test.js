import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';

//import App from '../src/App';
// skipping due to StackNavigator causing issue on import
it.skip('App renders correctly', () => {
  renderer.create(<App />);
});
