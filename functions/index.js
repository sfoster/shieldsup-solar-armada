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

function getCollection(path) {
  const ref = db.ref(path);
  console.log("Requesting:", path);
  return new Promise(resolve => {
    ref.once("value", (snapshot) => {
      resolve(snapshot.val());
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
  let authorized = false;
  // NB: ID token verification requires a project ID.
  // https://firebase.google.com/docs/auth/admin/verify-id-tokens
  let credential = req.headers.authorization;
  if (!credential && req.body && req.body.credential) {
    credential = req.body.credential;
  }
  console.log("checkAuth, trying credential:", credential);
  if (credential) {
    let nameValue = credential.split(/;\s*/).find(part => part.startsWith("token="));
    const [_,idToken] = (nameValue || "").split("=");
    if (idToken) {
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
      return;
    }
  }
  resp.status(403).json({ "status": "unauthorized", "ok": false });
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
      const results = await getCollection(collName);
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
  const playerRef = ref(db, `players/${app.locals.uid}`);
  try {
    playerRef.update({
      // TODO: validate this gameId: it should exist, be open etc.
      // Could use a transaction to get the game document, write the playerId and displayName in there
      // While also writing the gameId to the player document
      gameId: req.params.gameId
    });
  } catch (ex) {
    success = false;
    console.warn("Failed to add player:", ex);
  }
  if (success) {
    resp.json({
      status: "ok",
      ok: true,
    });
  } else {
    resp.status(512).json({ "status": "nope", ok: false });
  }
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

exports.webApi = functions.https.onRequest(app);
