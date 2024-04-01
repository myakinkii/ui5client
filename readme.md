minesNF_openUI5
===========
### sap openui5 client for http://minesnf.com - cooperative non-flagging minesweeper

### to run locally
build minesNF.js lib (requires [browserify](https://browserify.org/#install) installed) from [backend repo](https://github.com/myakinkii/minesNF) like this ``browserify Modes.js --standalone minesNF > path/to/ui5client/webapp/lib/minesNF.js``

then run ``ui5 serve`` (requires [ui5 cli](https://sap.github.io/ui5-tooling/) installed)

### to build mobile app
set ``"localSrv": false`` and  ``"offlineMode": false`` in index.html

to change app icon replace logo.png and run ``npm run cap:assets``

then run ``npm run build`` and ``npm run cap:sync``

and proceed to xcode or android studio with ``npm run cap:open ios`` or ``npm run cap:open android``
