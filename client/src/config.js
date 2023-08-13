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
} else {
  // the config from firebase hosting -> app SDK configuration
  firebaseConfig = {
    apiKey: "AIzaSyBMXvHUDiqjpmLfznl-gu8iRPYafQW8eC8",
    authDomain: "shieldsup-api-test.firebaseapp.com",
    databaseURL: "https://shieldsup-api-test-default-rtdb.firebaseio.com",
    projectId: "shieldsup-api-test",
    storageBucket: "shieldsup-api-test.appspot.com",
    messagingSenderId: "593268412435",
    appId: "1:593268412435:web:a9bee5075c04355ce1efe6"
  };
}

export {
  firebaseConfig,
  firebaseEmulators,
  inEmulation,
};