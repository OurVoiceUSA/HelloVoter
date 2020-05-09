
## Production Setup

The defaults from the "npm run database" aren't suitable for a production environment. You will have to configure the Neo4j database yourself. Below is an example to get started from.

First, export some variables to use, and be sure to change the password prior to running!

    export HEAP_SIZE=4G
    export PAGE_SIZE=12G
    export NEO4J_PASS=yournewpassword

    # ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ #
    # change that password. Do it!    #
    # ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ #

Then setup hellovoter with docker:

    sudo mkdir -p /opt/neo4j/{data,import,plugins,logs}
    echo "monitor readonly" > jmx.access
    echo "monitor Neo4j" > jmx.password
    chmod 400 jmx.access jmx.password
    sudo mv jmx.access jmx.password /opt/neo4j/logs/
    sudo chown -R 101:101 /opt/neo4j

    docker run -d --name hellovoterapi \
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
      -e NEO4J_AUTH=neo4j/$NEO4J_PASS ourvoiceusa/hellovoterapi

Feel free to adjust the paths of the `bind` mounts to suite your environment. For large databases, we recommend you put the logs on a different storage device than the data.

You can connect to the database with a web browser by navigating to `YOUR_IP:7474`. Or if you prefer to do so via the command line, you can use the `cypher-shell` command from the running docker container:

    docker exec -ti $(docker ps -qf name=hellovoter) cypher-shell -u neo4j -p $NEO4J_PASS

Now you can navigate to the web app which is published here: https://apps.ourvoiceusa.org/hellovoter/

On the organize screen, enter the public domain name of your server and click one of the sign-in options. Make sure you have SSL properly configured!
