const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
let inEmulation = process.env.FUNCTIONS_EMULATOR && process.env.FUNCTIONS_EMULATOR == "true";
//const serviceAccount = require("../.secrets/api-project-482814424574-de59b6e3ffb8.json");
const PROJECT_ID = "demo-shieldsup-api-test";
const firebaseProjectConfig = Object.assign(
  {
    projectId: PROJECT_ID,
    // credential: admin.credential.cert(serviceAccount),
    // The database URL depends on the location of the database
    databaseURL: `http://localhost:9000/?ns=${PROJECT_ID}`
  },
  functions.config().firebase
);

const express = require("express");
// Initialize the app with a service account, granting admin privileges
admin.initializeApp(firebaseProjectConfig);
const db = admin.database();
const app = express();

function promiseSnapshot(pathOrRef) {
  const ref = typeof pathOrRef == "string" ? db.ref(pathOrRef) : pathOrRef;
  return new Promise(resolve => {
    ref.once("value", (snapshot) => {
      resolve(snapshot);
    });
  });
}

function updateDocument(path, newData) {
  console.log("updateDocument, inEmulation:", inEmulation, typeof inEmulation);
  console.log("updateDocument, got path:", path, newData);

  const ref = db.ref(path);
  return documentRefChange(ref, "update", newData);
}

function documentRefChange(ref, method, theData) {
  const promiseComplete = new Promise((resolve, reject) => {
    ref[method](Object.assign({}, theData, {
      lastUpdated: Date.now(),
    }), (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  return promiseComplete;
}

function checkAuth(req, resp, next) {
  // NB: ID token verification requires a project ID.
  // https://firebase.google.com/docs/auth/admin/verify-id-tokens
  let credential = req.headers.authorization ?? req.body?.credential;
  let idToken;
  if (credential) {
    let nameValue = credential.split(/;\s*/).find(part => part.startsWith("token="));
    const [_,token] = (nameValue || "").split("=");
    idToken = token;
  } else if(req.params.token) {
    idToken = req.params.token;
  }
  if (!idToken) {
    return resp.status(401).json({ "status": "no token found", "ok": false });
  }

  console.log("checkAuth, trying with token:", idToken);
  const firebaseAuth = getAuth();
  firebaseAuth.verifyIdToken(idToken)
    .then((decodedToken) => {
      app.locals.uid = decodedToken.uid;
      console.log("idToken verified, uid:", app.locals.uid);
      next();
    })
    .catch(error => {
      console.warn("error verifying token:", error);
      resp.status(401).json({ "status": "token-revoked", "ok": false });
    });
}

function checkProposedChange(req, resp, next) {
  let changeOk = true;
  console.log("checkProposedChange:", req.body);
  const docData = req.body.data;
  if (docData && docData.displayName) {
    // some bogus check on the new document data
    changeOk = !docData.displayName.toLowerCase().includes("rudeword");
  }
  if (changeOk) {
    next();
  } else {
    resp.status(403).json({ "status": "denied", "ok": false });
  }
}

app.use(express.json());
// require all API requests to be auth"d.
app.use("/api", checkAuth);

app.get("/api", (req, resp) => {
  resp.json({ "status": "ok", ok: true });
});

app.get(
  "/api/hello", (req, resp) => {
    resp.json({ message: "Hi", "status": "ok", ok: true });
  }
);

app.get(
  "/api/games/:id",
  async (req, resp) => {
    const payload = {};
    for (let collName of ["games", "users"]) {
      const results = await promiseSnapshot(collName).val();
      payload[collName] = results;
    }
    resp.json(payload);
  }
);

app.all(
  ["/api/unauthorized", "/api/unauthorized/*"],
  async (req, resp) => {
    resp.status(401).json({ "status": "unauthorized", ok: false });
  }
)

app.all(
  ["/api/forbidden", "/api/forbidden/*"],
  async (req, resp) => {
    resp.status(403).json({ "status": "denied", ok: false });
  }
)

app.post("/api/usercheck", async (req, resp) => {
  // if the auth middleware lets us get this far, all is good
  resp.json({
    status: "ok",
    uid: app.locals.uid,
    ok: true,
  });
});

app.post("/api/joinserver", async (req, resp) => {
  let success = true;
  let message = "";
  try {
    // create a new server user object, using the auth'd uid
    const playerRef = db.ref(`players/${app.locals.uid}`);
    const lastSeen = Date.now();
    console.log("Handling joinserver, updating player doc with:", req.body.data);
    playerRef.set(Object.assign({
      lastSeen
    }, req.body.data));
  } catch (ex) {
    success = false;
    message = ex.message;
  }
  if (success) {
    resp.json({
      status: "ok",
      ok: true,
    });
  } else {
    console.log("Returning error 512 because: ", message);
    resp.status(512).json({ "status": "nope", ok: false });
  }
});

app.post("/api/joingame/:gameId", async (req, resp) => {
  // attach the user to this game
  console.log("handling request to join game:", req.params.gameId);
  let success = true;
  let gameData;
  let gameId = req.params.gameId;
  const uid = app.locals.uid;
  const playerRef = db.ref(`players/${uid}`);
  const gameRef = db.ref(`games/${gameId}`);
  let snapshot = await promiseSnapshot(gameRef);

  if (!snapshot.exists()) {
    console.log("no such game, creating it:", req.params.gameId);
    const createdPromise = new Promise((resolve, reject) => {
      gameRef.set({
        gameId,
        displayName: "",
        players: {},
        created: Date.now(),
        complete: false
      }, (error => {
        if (error) reject(error);
        else resolve(true);
      }));
    });
    try {
      await createdPromise;
      snapshot = await promiseSnapshot(gameRef);
    }
    catch (ex) {
      resp.status(512).json({ "status": "nope", ok: false, message: `Failed to create "games/${gameId}"` });
      return;
    }
  }

  console.log("starting the join-game transaction");
  gameRef.transaction(() => {
    gameData = snapshot.val();
    console.log("join game, gameData:", gameData);

    // add the game to the player
    console.log(`Add ${gameId} to player`);
    playerRef.update({
      gameId,
    });
    // add the player to the game
    console.log(`Add ${uid} to game/players`);
    gameRef.child("players").update({
      [uid]: Object.assign({}, req.body.data, { uid, joined: Date.now() }),
    });
    console.log(`transaction done`);
  }).then(() => {
    console.log(`transaction promise resolved, responding with status:ok`);
    resp.json({
      status: "ok",
      ok: true,
      message: `player ${uid} added to game ${gameId}`,
    });
  }).catch(ex => {
    console.log(`transaction promise rejected, responding with 512`);
    resp.status(512).json({ "status": "nope", ok: false });
  })
});

app.post("/api/leavegame", async (req, resp) => {
  // dettach the user from their current game
  console.log("handling request to leave game");
  const uid = app.locals.uid;
  let gameData;
  let playerRef = db.ref(`players/${uid}`);
  let playerSnapshot = await promiseSnapshot(playerRef);
  let { gameId } = playerSnapshot.val();
  if (!gameId) {
    resp.status(512).json({ "status": "nope", ok: false });
    return;
  }
  const gameRef = db.ref(`games/${gameId}`);
  let snapshot = await promiseSnapshot(gameRef);
  gameRef.transaction(() => {
    gameData = snapshot.val();
    // remove the player from the game
    gameRef.child(`players/${uid}`).remove();
    // remove the game from the player
    playerRef.child("gameId").remove();
  }).then(() => {
    resp.json({
      status: "ok",
      ok: true,
      message: `player {uid} removed from game {gameId}`,
    });
  }).catch(ex => {
    resp.status(512).json({ "status": "nope", ok: false });
  })
});

// check any update against some game logic
app.put("/api/games/:id", checkProposedChange, async (req, resp) => {
  if (resp.headersSent) {
    return;
  }
  console.log("Update game: ", req.params.id, req.body);
  let result = "Alright";
  let ok = true;
  try {
    await updateDocument(`games/${req.params.id}`, req.body.data);
  } catch (ex) {
    console.warn("Failed to update:", ex);
    result = "Fail";
    ok = false;
  }
  console.log("update sent, result:", result);
  resp.json({
    status: result,
    ok
  });
});

app.post("/api/import/:sceneId", async (req, resp) => {
  if (resp.headersSent) {
    return;
  }
  const sceneRef = db.ref(`scenes/${req.params.sceneId}`);
  const entitiesRef = sceneRef.child("entities");
  const assetsRef = sceneRef.child("assets");
  let entitiesData = {};
  let assetsData = {};
  for (let entity of req.body.data?.entities || []) {
    entitiesData[entity.id] = entity;
  }
  for (let asset of req.body.data?.assets || []) {
    assetsData[asset.id] = asset;
  }
  assetsRef.set(assetsData);
  entitiesRef.set(entitiesData);

  resp.json({
    status: "imported",
    ok: true,
  });

});

exports.webApi = functions.https.onRequest(app);
