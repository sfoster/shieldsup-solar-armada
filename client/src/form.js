// src/form.js
import { GameClient } from './game-client';

import {
  firebaseConfig,
  firebaseEmulators,
  inEmulation,
} from './config';

import { initializeApp } from 'firebase/app';

const firebaseApp = initializeApp(firebaseConfig);

function connectClient() {
  console.log("in connectClient");
  const client = new GameClient();
  client.init(firebaseApp);
  return client;
}

const LoginUI = window.LoginUI = new class _LoginUI {
  init(rootElem) {
    console.log("Init UI with rootElem:", rootElem);
    this.rootElem = rootElem;
    this.form = rootElem.querySelector("form");
    this.rootElem.addEventListener("click", this);
  }
  handleButtonClick(event) {
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
    window.UI.update({ loggedIn: true });
  });
  client.on("signedout", () => {
    window.UI.update({ loggedIn: false });
  });
});

