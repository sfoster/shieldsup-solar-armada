// src/index.js
import { useClient, useDatabase, RemoteObject, RemoteList } from './collections';
import { EventEmitterMixin } from './event-emitter';
import { DocumentItem, DocumentsList, GamesList } from './elements';

import {
  firebaseConfig,
  firebaseEmulators,
  inEmulation,
} from './config';

import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator, ref, child, onValue, get } from 'firebase/database';
import { getAuth, signOut, signInAnonymously, signInWithEmailAndPassword, connectAuthEmulator, onAuthStateChanged } from "firebase/auth";

customElements.define("doc-item", DocumentItem);
customElements.define("doc-list", DocumentsList);
customElements.define("games-list", GamesList);

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp, "http://localhost:9000/?ns=shieldsup-api-test");
useDatabase(db);

if (inEmulation) {
  // Point to the RTDB emulator running on localhost.
  console.log("Connecting database emulator", firebaseEmulators.database.host, firebaseEmulators.database.port);
  connectDatabaseEmulator(db, firebaseEmulators.database.host, firebaseEmulators.database.port);
}

function connectClient() {
  console.log("in connectClient");
  class _Client extends EventEmitterMixin(Object) {
    connected = false;
    init() {
      console.log("in _Client.init");
      this.auth = getAuth(firebaseApp);
      connectAuthEmulator(this.auth, "http://localhost:9099");
      onAuthStateChanged(this.auth, (user) => {
        console.log("onAuthStateChanged:", user);
        if (user) {
          this.connected = true;
          this.emit("signedin", user);
        } else {
          this.connected = false;
          this.emit("signedout");
        }
      });
    }
    logout() {
      return signOut(this.auth);
    }
    login(userid, password) {
      console.log("login, with:", userid, password);
      if (!userid) {
        console.log("in login, calling signInAnonymously");
        signInAnonymously(this.auth).catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          client.emit("error", { errorCode, errorMessage });
        });
      } else {
        console.log("in login, calling signInWithEmailAndPassword");
        signInWithEmailAndPassword(this.auth, userid, password).then(result => {
          console.log("Success from signInWithEmailAndPassword:", result);
        }).catch(error => {
          console.warn("error from signInWithEmailAndPassword", error);
        });
      }
    }
  };
  const client = new _Client();
  client.init();
  useClient(client);
  return client;
}

function updateUI({ loggedIn } = {}) {
  const remoteBackedElements = document.querySelectorAll("[data-remoteid]");
  console.log("remoteBackedElements:", remoteBackedElements.length);
  remoteBackedElements.forEach(elem => {
    switch (elem.dataType) {
      case "item":
        elem.disabled = !loggedIn;
        console.log("CE item type with remoteid", elem.dataset.remoteid);
        break;
      case "list": {
        elem.disabled = !loggedIn;
        if (loggedIn) {
          if (!elem.collection) {
            const collection = window[elem.id + "-model"] = new RemoteList(elem.dataset.remoteid);
            elem.setCollection(collection);
          }
        }
        break;
      }
      default:
        console.log("Unknown element with [remoteid]", elem);
        break;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("In DOMContentLoaded");
  const client = window.gameClient = connectClient();
  client.on("signedin", (user) => {
    console.log("Client signedin, got user:", user);
    const latest = window.theLatest = new RemoteObject("games/thelatest");
    latest.on("value", (val) => {
      document.getElementById("datalabel").textContent = latest.path;
      document.getElementById("datainput").textContent = JSON.stringify({
        displayName: val.displayName
      }, null, 2);
      console.log(`Got value from ${latest.path}: ${JSON.stringify(val)}`);
    });
    updateUI({ loggedIn: true });
  });
  client.on("signedout", () => {
    updateUI({ loggedIn: false });
  });
});

function updateModel(model, payload) {
  let data;
  try {
    data = JSON.parse(payload);
  } catch (ex) {
    console.warn("Bad data format, it should be valid JSON", ex);
    return;
  }
  // const model = window.theLatest;
  const url = `/api/${model.path}`;
  return apiRequest(url, "PUT", data);
}

const apiRequest = window.apiRequest = async function(path, method, bodyData) {
  console.log(`Sending request to update: ${url} with: ${payload}`);
  let resp = await fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyData)
  });
  if (resp.ok) {
    console.log("Got ok response:", await resp.text());
    // displayResult(await resp.json());
  } else {
    console.warn("error response:", resp);
  }
}
