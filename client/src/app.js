// src/app.js
import { useClient, useDatabase, RemoteObject, RemoteList } from './collections';
import { GameClient } from './game-client';
import { DocumentItem, DocumentsList, GamesList } from './elements';
import { PlayerCard } from './player';
import * as scenes from './ui-scenes';
import { UIApp } from './ui-app';
import { LoginScene } from './login-scene';
import { LobbyScene } from './lobby-scene';
import { GameScene } from './game-scene';
import { AframeSceneManager } from './aframe-scene-manager';
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

const defaultSceneData = [
  {
    "key": "assets",
    "value": {
      "skyimage": {
        "id": "skyimage",
        "src": "./assets/stars.png"
      },
    }
  },
  {
    "key": "entities",
    "value": {
      "default-sky": {
        "a-path": "#default-sky",
        "a-type": "sky",
        "id": "default-sky",
        "src": "#skyimage",
      },
    }
  }
];

window.addEventListener("DOMContentLoaded", () => {
  const client = connectClient(window.config);
  const aFSceneManager = new AframeSceneManager();
  const app = window.app = new (class _UIPage extends UIApp {
    constructor(elem, options = {}) {
      super(elem, options);
      console.log("_UIPage, this.options", this.options);
      this.client = this.options.client;
      this.client.on("signedin", this);
      this.client.on("signedout", this);
      this.client.on("usernogameid", this);
      this.client.playerDocument.on("value", this);

      this.afSceneManager = new AframeSceneManager();
    }
    handleTopic(topic, data, target) {
      switch (topic) {
        case "signedout":
          this.switchScene("login");
          break;
        case "signedin":
          if (this.currentScene.id == "login") {
            this.switchScene("lobby");
          }
          break;
        case "usernogameid":
          this.switchScene("lobby");
        default:
          console.log("No handler for topic:", topic);
          break;
      }
    }
    switchScene(name, params={}) {
      super.switchScene(name, params);
      if (this.currentScene.id == "game") {
        // we'll load the game's scene data into the a-frame scene
      } else {
        this.afSceneManager.loadStaticScene("default", defaultSceneData);
      }
    }
  })(document.body, { client });

  const playerCard = document.querySelector("player-card");
  playerCard.configure({ app, client });

  const sceneArgs = {
    app, client
  };

  for(const sceneElem of document.querySelectorAll(".ui-scene")) {
    if (!sceneElem.id) {
      console.warn("Scene element found with no id:", sceneElem);
      continue;
    }
    console.log("configure and register:", sceneElem.id);
    sceneElem.configure({ ...sceneArgs });
    app.registerScene(sceneElem.id, sceneElem);
  }
  // start at the welcome screen
  requestAnimationFrame(() => {

    console.log("Entry point, switching to 'welcome' scene");
    app.switchScene("welcome");
  });
});
