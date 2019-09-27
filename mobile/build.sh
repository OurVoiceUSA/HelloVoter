#!/bin/bash

set -ex

cd $(dirname $0)

rm -rf node_modules package-lock.json ios/build ios/pods ios/Podfile.lock android/build android/app/build
ncu -u
npm install

# iOS pods
(
  set -ex
  cd ios
  pod repo update
  pod install
)

# android release build
(
  set -ex
  cd android
  ./gradlew app:assembleRelease
)

# build/launch iPhone simulator
react-native run-ios --simulator "iPhone 11"

