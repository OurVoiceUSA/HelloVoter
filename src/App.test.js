import React from 'react';
import { shallow } from 'enzyme';
import App from './App';

// it('renders without crashing', () => {
//   const div = document.createElement('div');
//   ReactDOM.render(<App />, div);
//   ReactDOM.unmountComponentAtNode(div);
// });

it('renders without crashing', () => {
  shallow(<App />);
});
