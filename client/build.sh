#!/bin/bash

set -ex

cd $(dirname $0)

rm -rf node_modules package-lock.json
ncu -u
npm install

docker build --pull -t ourvoiceusa/hellovoterhq .

