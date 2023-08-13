# shieldsup-solar-armada

In this repo:

## Browser client
- ./client
- This is demo/prototype code for a HTML/JS/A-Frame browser-based client.
- Status is mostly proof-of-concept. There's a state machine kind of thing that connects a sequence of screens so you can log in, pick a game in the lobby and finally get dropped into the game's main scene rendered via A-Frame. You should be able to click the asteroids and the big potcruiser ship and a request will get sent to do damage. But there's no effects or turret or death scenes or whatever to visually confirm right now.
- Uses webpack for bundling, a light bit of lit.js for templating
- See config.js, app.js and game-client.js for the what and how of connecting to the firebase project resources
- See collections.js for some basic wrappers around firebase db so we can subscribe to updates from documents or queries/collections
- See game-scene.js for the actual request the game data, render it and set up interactions stuff.

## Firebase functions
- ./functions
- The firebase functions implementations
- Currently all in a single `index.js`, which uses express.js for some REST endpoints/routes, and defines a webApi firebase function
- Status is proof-of-concept. We use the admin SDK to read and write to the live db, and gate all requests on a valid auth.

## Configs
- ./firebase.json has the project id and other firebase-specific stuff used by the firebase CLI, emulators and the deployment
- Also, see client/src/config.js for the mostly-firebase config details the browser client uses. This includes support for running locally using the firebase emulators.

## Secrets
- Not included in the repo: you'll need to create a .service-key-shields-up-api.json containing the service account key to populate the admin SDK credentials needed for the webApi function.
- The firebase project config the browser client uses is in client/src/config.js (and is not supposed to be secret.)

## data
- ./sampledb.json can be imported at the root of your database and defines a few (bogus) players, a couple of pre-existing games and a scene with the assets/entities necessary to draw the "fighter-test" scene.
- You can create your own users in the auth settings in the firebase console (or emulator UI if you go that route.)
