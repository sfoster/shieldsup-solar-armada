// src/index.js
import { useClient, useDatabase, RemoteObject, RemoteList } from './collections';
import { GameClient } from './game-client';
import { DocumentItem, DocumentsList, GamesList } from './elements';

import {
  firebaseConfig,
  firebaseEmulators,
  inEmulation,
} from './config';

import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator, ref, child, onValue, get } from 'firebase/database';

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
  const client = new GameClient();
  client.init(firebaseApp);
  useClient(client);
  return client;
}

const UI = window.UI = new class _FormUI {
  get gameUpdateBtn() {
    return document.getElementById("gameUpdateBtn")
  }
  init(rootElem) {
    console.log("Init UI with rootElem:", rootElem);
    this.rootElem = rootElem;
    this.form = rootElem.querySelector("form");
    this.rootElem.addEventListener("click", this);
    window.gameClient.on("request/success", (result) => {
      this.displayStatus(result.status);
    });
    window.gameClient.on("request/failure", (result) => {
      this.displayStatus(result.status);
    });
  }
  update({ loggedIn } = {}) {
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
  handleButtonClick(event) {
    let action = event.target.dataset.action;
    event.preventDefault();
    if (action == "api-request") {
      const overrideUrl = this.form.elements["override-url"].value;
      if (overrideUrl) {
        window.gameClient.overrideUrl = overrideUrl;
      } else {
        delete window.gameClient.overrideUrl;
      }
    }
    switch (event.target.id) {
      case "loginBtn":
        window.gameClient.login("test@example.com", "testy1");
        break;
      case "anonLoginBtn":
        window.gameClient.login();
        break;
      case "logoutBtn":
        window.gameClient.logout();
        break;
      case "gameUpdateBtn": {
        const pathId = document.getElementById('datalabel').textContent.trim();
        let data;
        try {
          data = JSON.parse(document.getElementById('datainput').value);
        } catch (ex) {
          console.warn("Bad data format, it should be valid JSON", ex);
          return;
        }
        window.gameClient.updateEntity(
          pathId, data
        );
        break;
      }
    }
  }
  handleEvent(event) {
    if (event.type == "click" && event.target.localName =="button") {
      this.handleButtonClick(event);
    }
  }
  displayStatus(statusValue) {
    const item = document.createElement("li");
    item.textContent = statusValue;
    this.rootElem.querySelector("#status").appendChild(item);
  }
}();

document.addEventListener("DOMContentLoaded", async () => {
  console.log("In DOMContentLoaded");
  const client = window.gameClient = connectClient();
  window.UI.init(document.body);
  client.on("signedin", ({ user, idToken }) => {
    console.log("Client signedin, got idToken:", idToken);
    console.log("Client signedin, got user:", user);
    const latest = window.theLatest = new RemoteObject("games/thelatest");
    latest.on("value", (val) => {
      document.getElementById("datalabel").textContent = latest.path;
      document.getElementById("datainput").textContent = JSON.stringify({
        displayName: val.displayName
      }, null, 2);
      console.log(`Got value from ${latest.path}: ${JSON.stringify(val)}`);
    });
    window.UI.update({ loggedIn: true });
  });
  client.on("signedout", () => {
    window.UI.update({ loggedIn: false });
  });
});

