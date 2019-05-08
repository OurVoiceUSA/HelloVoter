## Introduction

Our Voice USA is a 501(c)(3) non-profit, non-partisian organization for civic education. We are writing tools to engage everyday citizens with the political process by providing easy access to civic information that's relevant to the individual.

## Features

This is the API backend to the HelloVoter canvass functions for large operations. Select the "Connect to Server" canvassing mode and enter the address you deploy this API to.

## Setup

You need a Neo4j database with the `spatial` and `apoc` plugins installed. You can get this setup with docker easily with the below:

First, export some variables to use, and be sure to change the password prior to running!

    export HEAP_SIZE=4G
    export PAGE_SIZE=12G
    export NEO4J_PASS=yournewpassword
    
    # ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ #
    # change that password. Do it!    #
    # ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ #

Then setup neo4j with docker:

    sudo mkdir -p /opt/neo4j/{data,import,plugins,logs}
    echo "monitor readonly" > jmx.access
    echo "monitor Neo4j" > jmx.password
    chmod 400 jmx.access jmx.password
    sudo mv jmx.access jmx.password /opt/neo4j/logs/
    (
      cd /opt/neo4j/plugins
      sudo curl -LO https://github.com/neo4j-contrib/spatial/releases/download/0.26.1-neo4j-3.4.9/neo4j-spatial-0.26.1-neo4j-3.4.9-server-plugin.jar
      sudo curl -LO https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/3.5.0.1/apoc-3.5.0.1-all.jar
    )
    sudo chown -R 100:101 /opt/neo4j

    docker run -d --name neo4j \
      --mount type=bind,src=/opt/neo4j/data,dst=/data \
      --mount type=bind,src=/opt/neo4j/import,dst=/import \
      --mount type=bind,src=/opt/neo4j/plugins,dst=/plugins \
      --mount type=bind,src=/opt/neo4j/logs,dst=/logs \
      -e NEO4J_dbms_security_procedures_unrestricted=apoc.\\\* \
      -e NEO4J_dbms_memory_pagecache_size=$PAGE_SIZE \
      -e NEO4J_dbms_memory_heap_initial__size=$HEAP_SIZE \
      -e NEO4J_dbms_memory_heap_max__size=$HEAP_SIZE \
      -e NEO4J_dbms_directories_tx__log=/logs \
      -e NEO4J_dbms_jvm_additional="-Dcom.sun.management.jmxremote.authenticate=true -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.password.file=/logs/jmx.password -Dcom.sun.management.jmxremote.access.file=/logs/jmx.access -Dcom.sun.management.jmxremote.port=9999 -Djava.rmi.server.hostname=127.0.0.1" \
      --network host --add-host $(hostname):127.0.0.1 \
      -e NEO4J_AUTH=neo4j/$NEO4J_PASS neo4j:3.5.3

Feel free to adjust the paths of the `bind` mounts to suite your environment. For lage databases, we recommend you put the logs on a different storage device than the data.

You can connect to the database with a web browser by navigating to `YOUR_IP:7474`. Or if you prefer to do so via the command line, you can use the `cypher-shell` command from the running docker container:

    docker exec -ti $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p $NEO4J_PASS

Finally, setup to run the server and connect to the database:

    git clone https://github.com/OurVoiceUSA/HelloVoterAPI.git
    cd HelloVoterAPI
    echo "NEO4J_PASS=$NEO4J_PASS" > .env
    
    npm install
    npm start

Now you can navigate to the web UI which is published here: https://apps.ourvoiceusa.org/HelloVoterHQ/

Enter the domain name or public IP address of your server and and click one of the sign-in options.

After you sign in, switch to the neo4j console and make yourself an administrator by running the following query:

    match (v:Volunteer) where v.email = 'YOUR_EMAIL' set v.admin = true;

You should now be all set!

## Configuration

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
    AUTOENROLL_FORMID=
    VOLUNTEER_ADD_NEW=
    PURGE_IMPORT_RECORDS=
    DEBUG=

The meaning of each config item is as follows:

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
* `AUTOENROLL_FORMID`: The ID of the form new volunteers get auto-enrolled in with autoturf set so they can go right into the map with data, no approval needed. We use this for our demo server. You probably don't want to set this.
* `VOLUNTEER_ADD_NEW`: Whether or not volunteers can add new addresses & people that don't exist in the database.
* `PURGE_IMPORT_RECORDS`: By default, import records are kept in the database, so you can trace where things came from. For larger operations (>20 million), we recommend setting this to `1` as otherwise the speed of data imports will be significantly impacted.
* `DEBUG`: Whether or not cypher and other debugging info is sent to the console log.

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

