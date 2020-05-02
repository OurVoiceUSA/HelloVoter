#!/bin/sh

set -ex

rm -rf node_modules package-lock.json
ncu -u
npm install

sh database/build.sh
docker push ourvoiceusa/neo4j-hv
sh client/build.sh
sh server/build.sh
sh mobile/build.sh

