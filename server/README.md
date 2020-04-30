
## Configuration

For this server, configure an `.env` file. The following is a complete list of variables and their defaults:

    BASE_URI=/api
    SERVER_PORT=8080
    NEO4J_HOST=localhost
    NEO4J_PORT=7687
    NEO4J_USER=neo4j
    NEO4J_PASS=hellovoter
    NEO4J_JMX_PORT=9999
    NEO4J_JMX_USER=monitor
    NEO4J_JMX_PASS=Neo4j
    ENABLE_GEOCODE=false
    DISABLE_JMX=
    IP_HEADER=
    GOOGLE_MAPS_KEY=
    JOB_CONCURRENCY=1
    SM_OAUTH_URL=https://ws.ourvoiceusa.org/auth
    JWT_PUB_KEY=SM_OAUTH_URL/pubkey
    WABASE=https://apps.ourvoiceusa.org
    VOLUNTEER_ADD_NEW=
    DEBUG=

The meaning of each config item is as follows:

* `BASE_URI`: Routing prefix to the API calls
* `SERVER_PORT`: Port for node to listen on for http requests.
* `NEO4J_HOST`: Hostname of your neo4j server.
* `NEO4J_PORT`: Port number of your neo4j server.
* `NEO4J_USER`: Username to use to connect to neo4j.
* `NEO4J_PASS`: Password to use to connect to neo4j.
* `NEO4J_JMX_PORT`: The port on your `NEO4J_HOST` that exposes JMX. This port isn't exposed by default by Neo4j. See "Neo4j Configuration" below for how to set this up on the database side.
* `NEO4J_JMX_USER`: Username to use to connect to neo4j jmx.
* `NEO4J_JMX_PASS`: Password to use to connect to neo4j jmx.
* `ENABLE_GEOCODE`: Allow import of data that doesn't have longitude/latitude
* `DISABLE_JMX`: Don't attempt to connect to neo4j jmx.
* `IP_HEADER`: Name of the header to check for, if you're behind an http reverse proxy and want to deny direct http requests.
* `GOOGLE_MAPS_KEY`: API Key for Google maps. Get one here: https://developers.google.com/maps/documentation/javascript/get-api-key
* `JOB_CONCURRENCY`: Number of import jobs that can run in parallel. This is only relevant if you're using Neo4j Enterprise Edition, as Community Edition is limited to 4 CPUs, and the minimum CPUs required for parallel jobs is 6.
* `SM_OAUTH_URL`: URL of the oauth provider.
* `JWT_PUB_KEY`: Path to the public key of the oauth provider.
* `WABASE`: URL of the HelloVoterHQ react application.
* `VOLUNTEER_ADD_NEW`: Whether or not volunteers can add new addresses & people that don't exist in the database.
* `DEBUG`: Whether or not cypher and other debugging info is sent to the console log.
