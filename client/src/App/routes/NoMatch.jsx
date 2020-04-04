import React from 'react';

const NoMatch = ({ location }) => (
  <div>
    <h1>OOOPS!!</h1>
    <div>
      We can't seem to find the page you're looking for:
      <br />
      <br />
      <code>{location.pathname}</code>
      <br />
      <br />
      If you feel this page is in error,{' '}
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://github.com/OurVoiceUSA/HelloVoter/issues/new"
      >
        report an issue
      </a>{' '}
      and the coders will take a look.
    </div>
  </div>
);

export default NoMatch;
