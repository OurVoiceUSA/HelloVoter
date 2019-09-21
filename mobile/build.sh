#!/bin/bash

# stop script on any failure
set -e

# clean entire build cache
rm -rf node_modules ios/build ios/pods ios/Podfile.lock android/build android/app/build package-lock.json 

# update all dependancies
ncu -u

# install dependancies
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

