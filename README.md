## Introduction

Our Voice USA is a 501(c)(3) non-profit, non-partisian organization for civic education. We are writing tools to engage everyday citizens with the political process by providing easy access to civic information that's relevant to the individual.

## Features

This is in development, and will be the API backend to the HelloVoter canvass functions for large operations. The current production mobile app uses Dropbox for data sharing and storage.

## Setup

You need a Neo4j database with the `spatial` and `apoc` plugins installed. See the Neo4j Setup below for more information.

For this server, configure an `.env` file. The following is a complete list of variables and their defaults:

    SERVER_PORT=8080
    NEO4J_HOST=localhost
    NEO4J_USER=neo4j
    NEO4J_PASS=neo4j
    NEO4J_JMX_PORT=9999
    NEO4J_JMX_USER=monitor
    NEO4J_JMX_PASS=Neo4j
    IP_HEADER=
    GOOGLE_MAPS_KEY=
    JOB_CONCURRENCY=1
    SM_OAUTH_URL=https://ws.ourvoiceusa.org/auth
    JWT_PUB_KEY=SM_OAUTH_URL/pubkey
    WABASE=https://apps.ourvoiceusa.org
    DEBUG=

Then, install dependancies with `npm install`, and start with `npm start`.

## Configuration

* `SERVER_PORT`: Port for node to listen on for http requests.
* `NEO4J_HOST`: Hostname of your neo4j server.
* `NEO4J_USER`: Username to use to connect to neo4j.
* `NEO4J_PASS`: Password to use to connect to neo4j.
* `NEO4J_JMX_PORT`: The port on your `NEO4J_HOST` that exposes JMX. This port isn't exposed by default by Neo4j. See "Neo4j Configuration" below for how to set this up on the database side.
* `NEO4J_JMX_USER`: Username to use to connect to neo4j jmx.
* `NEO4J_JMX_PASS`: Password to use to connect to neo4j jmx.
* `IP_HEADER`: Name of the header to check for, if you're behind an http reverse proxy and want to deny direct http requests.
* `GOOGLE_MAPS_KEY`: API Key for Google maps. Get one here: https://developers.google.com/maps/documentation/javascript/get-api-key
* `JOB_CONCURRENCY`: Number of import jobs that can run in parallel. This is only relevant if you're using Neo4j Enterprise Edition, as Community Edition is limited to 4 CPUs, and the minimum CPUs required for parallel jobs is 6.
* `SM_OAUTH_URL`: URL of the oauth provider.
* `JWT_PUB_KEY`: Path to the public key of the oauth provider.
* `WABASE`: URL of the HelloVoterHQ react application.
* `DEBUG`: Whether or not cypher and other debugging info is sent to the console log.

## Neo4j Setup

The default initial username/password is neo4j/neo4j, you'll want to change this immediatly. See here: https://neo4j.com/docs/operations-manual/current/configuration/set-initial-password/

If running Neo4j in Docker, you can set the initial username/password by setting this environment variable:

     NEO4J_AUTH=neo4j/newpassword

Two plugins are required for how we use Neo4j; `spatial` and `apoc`. Have a look at our `neo4j/Dockerfile` for reference.

Enabling JMX is recommended, but not required. Without it, you will be unable to use `JOB_CONCURRENCY`, and certain imports may run slower than they otherwise would. To enable JMX, add the java arguments below, and be sure to replace the `NEO4J_HOST` at the end with your hostname:

    NEO4J_dbms_jvm_additional="-Dcom.sun.management.jmxremote.authenticate=true -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.password.file=/var/lib/neo4j/conf/jmx.password -Dcom.sun.management.jmxremote.access.file=/var/lib/neo4j/conf/jmx.access -Dcom.sun.management.jmxremote.port=9999 -Djava.rmi.server.hostname=NEO4J_HOST"

You can change the default JMX username/password by editing the jmx.access and jmx.password files (normally in /var/lib/neo4j/conf). Be sure you set them in your .env file as well.

## Contributing

Thank you for your interest in contributing to us! To avoid potential legal headaches please sign our CLA (Contributors License Agreement). We handle this via pull request hooks on GitHub provided by https://cla-assistant.io/

Please also read our [code of conduct](CODE_OF_CONDUCT.md).

## License

	Software License Agreement (AGPLv3+)
	
	Copyright (c) 2018, Our Voice USA. All rights reserved.

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

