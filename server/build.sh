#!/bin/bash

set -ex

cd $(dirname $0)

rm -rf node_modules package-lock.json
ncu -u
npm install

# fix server java@0.9.1 problem
rm -f package-lock.json
npm install

# build client & server via docker
docker build --pull -t ourvoiceusa/hellovoterapi .

