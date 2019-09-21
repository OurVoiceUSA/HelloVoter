#!/bin/bash

# stop script on any failure
set -e

# clean entire build cache
rm -rf node_modules */node_modules package-lock.json */package-lock.json

# update all dependancies
(
  ncu -u
  cd client
  ncu -u
  cd ../server
  ncu -u
)

# install dependancies
npm install

# fix server java@0.9.1 problem
(
  cd server
  rm -f package-lock.json
  npm install
)

# build client & server via docker
docker build --pull -t ourvoiceusa/hellovoterhq client
docker build --pull -t ourvoiceusa/hellovoterapi server
docker build --pull -t ourvoiceusa/neo4j-hv database

# build mobile app
cd mobile

rm -rf ios/build ios/pods ios/Podfile.lock android/build android/app/build

ncu -u

npm install

# iOS pods
(
  cd ios
  pod repo update
  pod install
)

# android release build
(
  cd android
  ./gradlew assembleRelease
)

# build/launch iPhone simulator
react-native run-ios

