#!/bin/bash

if [ ! -f /data/dbms/auth ]; then
  if [ -f /run/secrets/neo4j_pass ]; then
    NEO4J_PASS=$(cat /run/secrets/neo4j_pass)
  else
    [ -z "$NEO4J_PASS" ] && export NEO4J_PASS=hellovoter
  fi
  export NEO4J_AUTH=neo4j/$NEO4J_PASS
fi

node node_modules/@babel/node/lib/_babel-node app/server.js & disown
exec /docker-entrypoint.sh neo4j
