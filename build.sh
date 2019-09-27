#!/bin/bash

set -ex

rm -rf node_modules package-lock.json
ncu -u
npm install

sh client/build.sh
sh database/build.sh
sh server/build.sh
sh mobile/build.sh

