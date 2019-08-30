## HelloVoter Mobile App

Find this app on the [Google Play Store (Android)](https://play.google.com/store/apps/details?id=org.ourvoiceinitiative.ourvoice) and the [Apple Store (iPhone)](https://itunes.apple.com/us/app/our-voice-usa/id1275301651?ls=1&mt=8).

## Production Deployment

Our Voice USA pushes regular releases to the app stores. Our desire is to collaborate on changes you may require in this mobile app and publish them in HelloVoter. If however you need to roll your own version of this app, make sure you comply with the license! While this app is open source, that does not make it yours. Things you have to do include (but are not limited to) the following:

* The license notice in the app must remain in prominent and conspicuous place, accessible prior to any kind of login.
* You must state next to the notice that this is a modified work of the original.
* You must provide a link next to the notice that sends the user to the corresponding modified source code.
* Logos, icons, and other artwork depicting the Our Voice bird are not for redistribution without express written permission by Our Voice USA.

## Development Setup

Start by settings up the back-end service - see the `civic-broker` git repository.

Set up your `.env` file:

    cat << EOF > .env
    WS_BASE=YOUR_CIVIC_BROKER_URL
    GOOGLE_API_KEY_IOS=YOUR_KEY
    GOOGLE_API_KEY_ANDROID=YOUR_KEY
    EOF

* The `GOOGLE_API_KEY_` values are credentials created by visiting http://console.developers.google.com/
* Without these keys, address searches and geocoding won't function, which limits functionality

Install https://nodejs.org/en/download/ if you havne't already, and run:

    npm install
    npm install -g react-native-cli

If you're developing the **Android** app - install https://developer.android.com/studio/releases/ if you haven't already, import the `HelloVoter/android` project, and follow the prompts to download all the build and runtime dependancies. You'll also have to run this command:

`echo "sdk.dir = $HOME/Library/Android/sdk" > android/local.properties`

If you're developing the **iOS** app - simply install the build dependancies with pods:

`(cd ios/ && pod install)`

Finally, build the app:

`react-native run-ios` or `react-native run-android`

## Test Automation

For testing we use `mocha` and `detox`. Run the below to get setup with that:

    npm install -g detox-cli mocha-cli
    brew tap wix/brew
    brew install wix/brew/applesimutils
    brew tap facebook/fb
    brew install fbsimctl --HEAD

Then build/execute the tests:

* for iOS:
    detox build -c ios.sim.debug
    detox test -c ios.sim.debug

* for Android:
    detox build -c android.emu.debug
    detox test -c android.emu.debug

NOTE: Test Automation for Android generally seems to have issues due to it not following the latest version react native very well.
