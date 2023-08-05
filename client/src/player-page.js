import { useClient, useDatabase, RemoteObject, RemoteList } from './collections';
import { GameClient } from './game-client';
import { UIApp } from './ui-app';
import { Player } from './player';
import { DocumentItem, DocumentsList, GamesList } from './elements';
import { addAssets, addEntities, thawScene } from './aframe-helpers';

import {
  firebaseConfig,
  firebaseEmulators,
  inEmulation,
} from './config';

import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator, ref, child, onValue, get } from 'firebase/database';

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

window.addEventListener("DOMContentLoaded", () => {
  const client = connectClient(window.config);
  const app = window.app = new (class _UIPage {
    constructor(_client) {
      this.client = _client;
      document.addEventListener("click", this);
      this.client.on("signedin", this);
      this.client.on("signedout", this);
      this.client.playerDocument.on("value", this);
      document.getElementById("scene-picker").addEventListener("change", this);
    }
    handleEvent(event) {
      if (!event.target.id) {
        return;
      }
      if (event.target.id == "scene-picker") {
      }
      switch (event.target.id) {
        case "scene-picker": {
          if (event.type !== "change") {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          let sceneId = event.target.value;
          console.log("scene-picker change:", sceneId);
          if (sceneId && this.client.auth.currentUser) {
            this.selectScene(sceneId);
          }
          return;
        }
        case "loginBtn":
          this.client.login("test@example.com", "testy1");
          return;
        case "anonLoginBtn":
          this.client.login();
          return;
        case "logoutBtn":
          this.client.logout();
          return;
        case "validateBtn":
          this.client.validateUser();
          return;
        case "joinGameBtn":
          this.client.joinGame(event.target.dataset.gameid);
          return;
        case "leaveGameBtn":
          this.client.leaveGame(event.target.dataset.gameid);
          return;
        case "queueBtn":
          this.client.enqueueUser();
          return;
        case "importBtn": {
          console.log("handling importBtn click");
          let sceneId = document.querySelector("#importSceneId").value;
          let sceneData;
          try {
            sceneData = JSON.parse(document.querySelector("#importSceneData").value);
          } catch (ex) {
            console.warn("Failed to parse scene data as JSON", ex);
          }
          if (
            sceneId &&
            sceneData && (sceneData.entities || sceneData.assets)
          ) {
            return this.client.importScene(sceneId, sceneData);
          }
          console.warn("Can't import scene: Missing sceneId or sceneData");
          return;
        }
      }
    }
    handleTopic(topic, data, target) {
      switch (topic) {
        case "signedin":
          document.body.classList.add("logged-in");
          document.getElementById("loginBtn").disabled = true;
          document.getElementById("anonLoginBtn").disabled = true;
          document.getElementById("queueBtn").disabled = this.client.userInQueue;
          document.getElementById("joinGameBtn").disabled = this.client.userInGame || !this.client.userInQueue;
          document.getElementById("logoutBtn").disabled = false;
          document.getElementById("leaveGameBtn").disabled = !this.client.userInGame;
          this.updateRemoteCollections();
          break;
        case "signedout":
          document.body.classList.remove("logged-in");
          document.getElementById("loginBtn").disabled = false;
          document.getElementById("anonLoginBtn").disabled = false;
          document.getElementById("queueBtn").disabled = true;
          document.getElementById("joinGameBtn").disabled = true;
          document.getElementById("logoutBtn").disabled = true;
          document.getElementById("leaveGameBtn").disabled = true;
          this.updateRemoteCollections();
          break;
        case "value":
          console.log("Handling value topic:", data);
          if (target == this.client.playerDocument) {
            console.log("Handling update of playerDocument:", this.client.userInQueue);
            document.getElementById("queueBtn").disabled = this.client.userInGame || this.client.userInQueue;
            document.getElementById("joinGameBtn").disabled = this.client.userInGame || !this.client.userInQueue;
            document.getElementById("leaveGameBtn").disabled = !this.client.userInGame;
          } else if (target == this.scenesList) {
            console.log("Handling update of scenesList:", data);
            this.populateScenePicker(data);
          } else if (target == this.sceneDocument) {
            console.log("Handling update of sceneDocument:", data);
            this.loadScene(data);
          }
          break;
      }
    }
    populateScenePicker(scenesData) {
      let picker = document.getElementById("scene-picker");
      picker.options.length = 0;
      let fragment = document.createDocumentFragment();
      fragment.appendChild(new Option("", ""));
      for (let scene of scenesData) {
        fragment.appendChild(new Option(scene.key, scene.key));
      }
      picker.appendChild(fragment);
    }
    updateRemoteCollections() {
      console.log("updateRemoteCollections");
      if (this.scenesList) {
        this.scenesList.off("value", this);
      }
      if (this.sceneDocument) {
        this.sceneDocument.off("value", this);
      }
      if (this.client.auth?.currentUser) {
        console.log("updateRemoteCollections, creating RemoteList for scenes");
        this.scenesList = new RemoteList("scenes");
        this.scenesList.on("value", this);
        console.log("updateRemoteCollections, creating RemoteDocument for scene");
        this.sceneDocument = new RemoteList();
        // we'll subscribe when we set a path
      }
    }
    selectScene(sceneId) {
      const scenePath = `scenes/${sceneId}`;
      console.log("selectScene, setting path:", scenePath)
      this.sceneDocument?.off("value", this);
      this.sceneDocument?.setPath(scenePath);
      this.sceneDocument?.on("value", this);
    }
    loadScene(data) {
      this._sceneData = data;
      // debounce a bit
      this._loadSceneTimer = setTimeout(() => {
        this._loadScene();
      }, 500);
    }
    _clearScene(afScene) {
      for (let child of afScene.children) {
        if (child.localName == "a-assets") {
          child.textContent = "";
          continue;
        }
        child.remove();
      }
    }
    _loadScene() {
      const afScene = document.querySelector("a-scene");
      this._clearScene(afScene);

      let [remoteAssets, remoteEntities] = this._sceneData;
      console.log("Updating scene with data:", remoteAssets, remoteEntities);
      let assetsList = Object.values(remoteAssets.value);
      let entitiesList = Object.values(remoteEntities.value);
      thawScene({
        assets: assetsList,
        entities: entitiesList
      }, afScene);
    }
  })(client);
  let playerCard = document.querySelector("player-card");
  playerCard.configure({ app, client });

});