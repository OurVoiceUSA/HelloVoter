import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';

import SettingsPage from '.';

it('Settings renders correctly', () => {
  renderer.create(<SettingsPage />);
});
