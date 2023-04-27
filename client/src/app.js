// src/app.js
import { useClient, useDatabase, RemoteObject, RemoteList } from './collections';
import { GameClient } from './game-client';
import { DocumentItem, DocumentsList, GamesList } from './elements';
import { UIApp } from './ui-app';
import * as scene from './ui-scene';

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
window.uiScene = scene;
console.log("scene module:", scene);

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

window.onload = function() {
  const app = window.app = new UIApp();

  const client =  game.client = connectClient(window.config);
  const sceneArgs = {
    app, client
  };
  for(const sceneElem of document.querySelectorAll(".ui-scene")) {
    if (!sceneElem.id) {
      console.warn("Scene element found with no id:", sceneElem);
      continue;
    }
    sceneElem.configure(sceneArgs);
    app.registerScene(sceneElem.id, sceneElem);
  }

  // start at the welcome screen
  app.switchScene("welcome");
};
