#!/bin/bash

set -ex

cd $(dirname $0)

rm -rf node_modules package-lock.json ios/build ios/pods ios/Podfile.lock android/build android/app/build
ncu -u
npm install

CI=true npm test

# iOS pods
(
  set -ex
  cd ios
  pod repo update
  pod install
)

# android release build
(
  cd android
  if [ -x ~/Library/Android/sdk/emulator/emulator ]; then
    set -ex
    ./gradlew app:assembleRelease
  else
    echo "WARNING: No emulator found. Not building android app!"
  fi
)

# build/launch iPhone simulator
react-native run-ios --simulator "iPhone 11"

