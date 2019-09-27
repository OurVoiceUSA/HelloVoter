#!/bin/bash

set -ex

cd $(dirname $0)

docker build --pull -t ourvoiceusa/neo4j-hv .

