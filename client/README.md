
## Web UI

This component is just the UI. It's meant to get deployed to a static CDN, such as where [Our Voice USA hosts a production copy](https://apps.ourvoiceusa.org/HelloVoterHQ/), you can simply use that one and enter your server address to use your system. However, feel free to roll your own build / URL of this if you need to.

## Production Deployment

Our Voice USA pushes regular releases to our website. Our desire is to collaborate on changes you may require in this webapp and publish them. If however you need to roll your own version of, make sure you comply with the license! While this is open source, that does not make it yours. Things you have to do include (but are not limited to) the following:

* The license notice must remain in prominent and conspicuous place, accessible prior to any kind of login.
* You must state next to the notice that this is a modified work of the original.
* You must provide a link next to the notice that sends the user to the corresponding modified source code.
* Logos, icons, and other artwork depicting the Our Voice bird are not for redistribution without express written permission by Our Voice USA.

All a production build requires is running `npm run build` and deploying the bundle somewhere.
