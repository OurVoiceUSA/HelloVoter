## Introduction

This is the mobile app for Our Voice Initiative, a 501(c)(4) non-profit, non-partisian organization for the civic education. We are writing tools to engage everyday citizens with the political process by providing easy access to civic information that's relevant to the individual.

## Features

Right now we list what districts you are in and who holds those offices, up and down the ballot. What's next is to let candidates, no matter what office they are running for, define who they are. Voters in turn are able to easily find who is running in their area by seeing them as challengers to the incumbents, and know where they stand on the issues compared to their own policy beliefs.

For voters, finding out information about candidates running for office is disjointed and unorganized. There is no clear, cohesive system by which candidates up and down the ballot can register and define their thoughts on policy. This puts a large burden on voters to do research in their limited free time, and many vote for a candidate without knowing a thing about him or her - other than perhaps their political party affiliation. Our app will bring all this information into a single place and displayed in an unbiased, non-partisan manner.

Likewise for candidates, the only option to accomplish canvassing and outreach needs as they gathered voter data door-to-door was sold to them by a couple of companies. Unfortunately, those canvassing companies charge people thousands of dollars to use their services which hinders people from accessing much needed information to run for office. This creates a high barrier to entry to run for office. Our app has a canvassing tool that's free to use - but in order to be viable, needs lots of work.

## Development Setup

Start by configuring the `.env` file:

    cat << EOF > .env
    WS_BASE=https://wsdev.ourvoiceusa.org
    GOOGLE_API_KEY_IOS=YOUR_KEY
    GOOGLE_API_KEY_ANDROID=YOUR_KEY
    EOF

* The `GOOGLE_API_KEY_` values are credentials created by visiting http://console.developers.google.com/. If you plan on releasing this app, or a fork of it yourself, be sure you lock down the API key to the assosiated platform device specified to avoid quota theft.
* Without these keys, the address and geocoding won't function, rendering the app basically worthless.

Install https://nodejs.org/en/download/ if you havne't already, and run:

    npm install
    npm install -g react-native-cli

The install may overwrite some dependancy overrides or other configuration - revert those by doing a force checkout:

`git checkout -f`

If you're developing the **Android** app - install https://developer.android.com/studio/releases/ if you haven't already, import the OVMobile project, and follow the prompts to download all the build and runtime dependancies. You'll also have to run this command:

`echo "sdk.dir = $HOME/Library/Android/sdk" > android/local.properties`

If you're developing the **iOS** app - simply install the build dependancies with pods:

`(cd ios/ && pod install)`

Finally, build the app:

`react-native run-ios` or `react-native run-android`

**NOTE:** At the time of this writing, the tool versions are as follows:

    $ npm -v
    5.6.0
    $ node -v
    v9.3.0
    $ react-native -v
    react-native-cli: 2.0.1
    react-native: 0.51.0

## License

GPLv3

