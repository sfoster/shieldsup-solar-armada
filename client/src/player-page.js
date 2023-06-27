import { useClient, useDatabase, RemoteObject, RemoteList } from './collections';
import { GameClient } from './game-client';
import { UIApp } from './ui-app';
import { Player } from './player';
import { DocumentItem, DocumentsList, GamesList } from './elements';

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
    }
    handleEvent(event) {
      console.log("handling click on target:", event.target);
      switch (event.target.id) {
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
          break;
        case "signedout":
          document.body.classList.remove("logged-in");
          document.getElementById("loginBtn").disabled = false;
          document.getElementById("anonLoginBtn").disabled = false;
          document.getElementById("queueBtn").disabled = true;
          document.getElementById("joinGameBtn").disabled = true;
          document.getElementById("logoutBtn").disabled = true;
          document.getElementById("leaveGameBtn").disabled = true;
          break;
        case "value":
          console.log("Handling value topic:", data);
          if (target == this.client.playerDocument) {
            console.log("Handling update of playerDocument:", this.client.userInQueue);
            document.getElementById("queueBtn").disabled = this.client.userInGame || this.client.userInQueue;
            document.getElementById("joinGameBtn").disabled = this.client.userInGame || !this.client.userInQueue;
            document.getElementById("leaveGameBtn").disabled = !this.client.userInGame;
          }
          break;
        }
    }
  })(client);
  let playerCard = document.querySelector("player-card");
  playerCard.configure({ app, client });

});