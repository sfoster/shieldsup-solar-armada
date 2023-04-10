const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getAuth } = require("firebase-admin/auth");
const firebaseProjectConfig = functions.config().firebase;

const express = require('express');
const serviceAccount = require("../.secrets/api-project-482814424574-de59b6e3ffb8.json");
// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  projectId: "demo-shieldsup-api-test",
  credential: admin.credential.cert(serviceAccount),
  // The database URL depends on the location of the database
  databaseURL: "http://localhost:9000/?ns=shieldsup-api-test"
});
const db = admin.database();
const app = express();
// const authMiddleWare = require("firebase-auth-express-middleware");

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
  console.log("updateDocument, got path:", path, newData);

  const ref = db.ref(path);
  return ref.update(Object.assign({}, newData, {
    lastUpdated: Date.now(),
  }));
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
      .then(() => {
        console.log("idToken verified");
        next();
      })
      .catch(error => {
        console.warn("error verifying token:", error);
        resp.status(403).json({ "status": "unauthorized"});
      });
      return;
    }
  }
  res.status(403).json({ "status": "unauthorized"});
}

app.use(express.json());
// require all API requests to be auth'd.
app.use('/api', checkAuth);

// respond with list of all entities and assets when a GET request is made to the homepage
app.get('/api', (req, resp) => {
  resp.json({ "status": "ok "});
});

app.get(
  "/api/hello",
  async (req, resp) => {
    resp.json({ message: "Hi"});
  }
);

app.get(
  "/api/games/:id",
  async (req, resp) => {
    const payload = {};
    for (let collName of ['games', 'users']) {
      const results = await getCollection(collName);
      payload[collName] = results;
    }
    resp.json(payload);
  }
);

app.put("/api/games/:id", async (req, resp) => {
  if (resp.headersSent) {
    return;
  }
  console.log("Update game: ", req.params.id, req.body);
  let result = "Alright";
  try {
    await updateDocument(`games/${req.params.id}`, req.body.data);
  } catch (ex) {
    console.warn("Failed to update:", ex);
    result = "Fail";
  }
  console.log("update sent, result:", result);
  resp.json({
    status: result,
  });
});

exports.webApi = functions.https.onRequest(app);
