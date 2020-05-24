import React from 'react';
import { Text } from '../lib/react-native';

import { ViewCenter } from '../components/Layout';
import { version } from '../../package.json';
import AboutOV from '../components/AboutOV';

const About = ({ refer }) => (
  <ViewCenter>
    <Text>
      HelloVoter Version {version}
    </Text>
    <AboutOV refer={refer} />
  </ViewCenter>
);

export default About;
