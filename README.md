## Introduction

Our Voice USA is a 501(c)(3) non-profit, non-partisan organization for civic education. We are writing tools to engage everyday citizens with the political process by providing easy access to civic information that's relevant to the individual.

## Development Setup

Docker is required to get the database running, so make sure you have that installed on your system.

To get set up locally, simply run the following commands:

    git clone https://github.com/OurVoiceUSA/HelloVoter.git
    cd HelloVoter
    npm install
    npm run database
    npm start

This sets up everything except the mobile app. To get setup with local development of the mobile app as well, see [mobile/README.md](mobile/README.md).

If you want to interact with the API from a script outside of the web app, make sure you include your JWT with the "Authorization: Bearer" header. You can either get the JWT from your browser's dev tools after you sign into the web app, or generate an API key for your user and use that instead of the JWT.

## Test Automation

Our goal is 100% code coverage and full regression of automated tests. As the tests are very heavily data dependent, a sandbox database is spun up before execution.

    npm test

The very first time you run this will take longer than normal to build and spin up the sandbox database. It remains running after the tests finish, so subsequent test executions will go much faster.

The sandbox database runs on a different port than the default Neo4j port. If you need to connect to it, use `57474` for the Neo4j Web UI port and `57687` for the bolt port after you load the UI.

Please be sure to write any tests that correspond to your code changes before you submit a pull request.

## Production Setup

This app is designed such that you do not need to deploy the mobile app or the web client, as Our Voice USA publishes the mobile app to the app stores and hosts a production copy of the react app here: https://apps.ourvoiceusa.org/HelloVoterHQ/ (details in [client/README.md](client/README.md))

See [database/README.md](database/README.md) for details on how to setup a database and [server/README.md](server/README.md) for details on how to configure and deploy the server.

## Contributing

Thank you for your interest in contributing to us! To avoid potential legal headaches please sign our CLA (Contributors License Agreement). We handle this via pull request hooks on GitHub provided by https://cla-assistant.io/

Please also read our [code of conduct](CODE_OF_CONDUCT.md).

## License

	Software License Agreement (AGPLv3+)

	Copyright (c) 2020, Our Voice USA. All rights reserved.

        This program is free software; you can redistribute it and/or
        modify it under the terms of the GNU Affero General Public License
        as published by the Free Software Foundation; either version 3
        of the License, or (at your option) any later version.

        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        GNU Affero General Public License for more details.

        You should have received a copy of the GNU Affero General Public License
        along with this program; if not, write to the Free Software
        Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.

**NOTE:** We relicense the mobile app code for the purposes of distribution on the App Store. For details, read our [CLA Rationale](CLA-Rationale.md)

Logos, icons, and other artwork depicting the Our Voice bird are copyright and not for redistribution without express written permission by Our Voice USA.
