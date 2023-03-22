const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firebaseProjectConfig = functions.config().firebase;

const express = require('express');
const serviceAccount = require("../.secrets/api-project-482814424574-de59b6e3ffb8.json");
// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // The database URL depends on the location of the database
  databaseURL: "http://localhost:9000/?ns=shieldsup-api-test"
});
// admin.initializeApp(firebaseProjectConfig);
const db = admin.database();

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
  return ref.update(Object.assign({},newData, {
    lastUpdated: Date.now(),
  }));
}

const app = express();
app.use(express.json());

// respond with list of all entities and assets when a GET request is made to the homepage
app.get('/api/', async (req, resp) => {
  const payload = {};
  for (let collName of ['games', 'users']) {
    const results = await getCollection(collName);
    payload[collName] = results;
  }
  resp.json(payload);
});

app.get('/api/hello', async (req, resp) => {
  resp.json({ message: "Hi"});
});

app.put("/api/games/:id", async (req, resp) => {
  console.log("Update game: ", req.params.id, req.body);
  let result = "Alright";
  try {
    await updateDocument(`games/${req.params.id}`, req.body);
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
