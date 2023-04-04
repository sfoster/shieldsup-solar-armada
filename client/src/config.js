const documentUrl = new URL(document.documentURI);
let inEmulation = false;
switch (documentUrl.host) {
  case "127.0.0.1:5000":
  case "localhost:5000":
  case "localhost:8000":
    inEmulation = true;
    break;
}

let firebaseConfig = {};
let firebaseEmulators;
if (inEmulation) {
  firebaseConfig = {
    apiKey: "fake-api-key",
    projectId: "demo-shieldsup-api-test",
  }
  console.log("inEmulation, firebaseConfig:", firebaseConfig);
  firebaseEmulators = {
    "auth": {
      "host": "localhost",
      "port": 9099
    },
    "database": {
      "host": "localhost",
      "port": 9000
    }
  };
}

export {
  firebaseConfig,
  firebaseEmulators,
  inEmulation,
};