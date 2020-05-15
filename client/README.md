## Production Deployment

Our Voice USA pushes regular releases. Our desire is to collaborate on changes you may require and publish them in HelloVoter. If however you need to roll your own version, make sure you comply with the license! While this app is open source, that does not make it yours. Things you have to do include (but are not limited to) the following:

* The license notice in the app must remain in prominent and conspicuous place, accessible prior to any kind of login.
* You must state next to the notice that this is a modified work of the original.
* You must provide a link next to the notice that sends the user to the corresponding modified source code.
* Logos, icons, and other artwork depicting the Our Voice bird are not for redistribution without express written permission by Our Voice USA.

## Development Setup for Native Mobile

Install https://nodejs.org/en/download/ if you havne't already, and run:

    git clone https://github.com/OurVoiceUSA/HelloVoter.git
    cd HelloVoter/client
    npm install

If you're developing the **Android** app - install https://developer.android.com/studio/releases/ if you haven't already, import the `HelloVoter/client/android` project, and follow the prompts to download all the build and runtime dependencies. You'll also have to run this command:

`echo "sdk.dir = $HOME/Library/Android/sdk" > android/local.properties`

If you're developing the **iOS** app - simply install the build dependencies with pods:

`(cd ios/ && pod install)`

You also may need to configure xcode to properly be able to do a `xcrun simctl`, more information here: https://stackoverflow.com/questions/29108172/xcrun-unable-to-find-simctl

Finally, build the app:

`npm run ios` or `npm run android`
