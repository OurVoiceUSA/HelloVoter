## Introduction

Our Voice Initiative is a 501(c)(4) non-profit, non-partisian organization for civic education. We are writing tools to engage everyday citizens with the political process by providing easy access to civic information that's relevant to the individual.

## Features

This is the API backend to the OVMobile canvass functions.

## Development Setup

Start by configuring the `.env` file:

    cat << EOF > .env
    export REDIS_HOST=localhost
    export REDIS_PORT=6379
    export WSBASE=http://localhost:8080
    export DEBUG=1
    EOF

Then, install dependancies with `npm install`, source in the configuration with `source .env`, and start with `npm start`.

**NOTE:** At the time of this writing, the tool versions are as follows:

    $ npm -v
    5.5.1
    $ node -v
    v8.9.3

## Contributing

Thank you for your interest in contributing to us! To avoid potential legal headaches please sign our CLA (Contributors License Agreement). We handle this via pull request hooks on GitHub provided by https://cla-assistant.io/

## License

	Software License Agreement (AGPLv3+)
	
	Copyright (c) 2018, Our Voice Initiative. All rights reserved.

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

