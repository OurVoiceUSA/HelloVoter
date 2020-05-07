#!/bin/bash

set -e

./gen-swagger.sh

exec node node_modules/@babel/node/lib/_babel-node app/server.js
