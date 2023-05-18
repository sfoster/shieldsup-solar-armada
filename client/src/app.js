// src/app.js
import { useClient, useDatabase, RemoteObject, RemoteList } from './collections';
import { GameClient } from './game-client';
import { DocumentItem, DocumentsList, GamesList } from './elements';
import { UIApp } from './ui-app';
import { UIScene } from './ui-scene';
import { LoginScene } from './login-scene';
import { LobbyScene } from './lobby-scene';
import * as scenes from './ui-scenes';

import {
  firebaseConfig,
  firebaseEmulators,
  inEmulation,
} from './config';

import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator, ref, child, onValue, get } from 'firebase/database';

for (const SceneClass of UIScene.scenes) {
  if (SceneClass.name) {
    console.log("Defining new custom UIScene-based element:", SceneClass.name);
    customElements.define(SceneClass.sceneName, SceneClass);
  }
}

customElements.define("doc-item", DocumentItem);
customElements.define("doc-list", DocumentsList);
customElements.define("games-list", GamesList);
window.uiScenes = scenes;
console.log("scenes module:", scenes);

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp, `http://localhost:9000/?ns=${firebaseConfig.projectId}`);
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

  const client = app.client = connectClient(window.config);
  console.log("onload, got game client:", client);
  console.log("onload, got app:", app);
  const sceneArgs = {
    app, client
  };
  for(const sceneElem of document.querySelectorAll(".ui-scene")) {
    if (!sceneElem.id) {
      console.warn("Scene element found with no id:", sceneElem);
      continue;
    }
    sceneElem.configure({ ...sceneArgs });
    app.registerScene(sceneElem.id, sceneElem);
  }

  // start at the welcome screen
  requestAnimationFrame(() => {
    app.switchScene("welcome");
  });
};
