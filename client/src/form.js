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

class UserInfo extends HTMLElement {
  constructor() {
    super();
    this.avatarSrc = "";
    this.details = "";
  }
  get avatarElem() {
    return this.shadowRoot.querySelector("#avatar");
  }
  get detailsElem() {
    return this.shadowRoot.querySelector("#details");
  }
  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      let avatarElem = document.createElement("div");
      avatarElem.id = "avatar";
      this.shadowRoot.appendChild(avatarElem);
      let detailsElem = document.createElement("div");
      detailsElem.id = "details";
      this.shadowRoot.appendChild(detailsElem);
      let styleElem = document.createElement("style");
      styleElem.textContent = `
        :host {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
        }
        #avatar {
          width: 64px;
          height: 64px;
          background: transparent no-repeat center;
          background-size: 48px;
          flex-basis: 64px;
        }
        #avatar.anon {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1' width='256' height='256' viewBox='0 0 256 256' xml:space='preserve'%3E%3Cg style='stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;' transform='translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)' %3E%3Cpath d='M 45 3 c 7.785 0 14.118 6.333 14.118 14.118 v 6.139 c 0 7.785 -6.333 14.118 -14.118 14.118 c -7.785 0 -14.118 -6.333 -14.118 -14.118 v -6.139 C 30.882 9.333 37.215 3 45 3 M 45 0 L 45 0 c -9.415 0 -17.118 7.703 -17.118 17.118 v 6.139 c 0 9.415 7.703 17.118 17.118 17.118 h 0 c 9.415 0 17.118 -7.703 17.118 -17.118 v -6.139 C 62.118 7.703 54.415 0 45 0 L 45 0 z' style='stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;' transform=' matrix(1 0 0 1 0 0) ' stroke-linecap='round' /%3E%3Cpath d='M 55.094 45.846 c 11.177 2.112 19.497 12.057 19.497 23.501 V 87 H 15.409 V 69.347 c 0 -11.444 8.32 -21.389 19.497 -23.501 C 38.097 47.335 41.488 48.09 45 48.09 S 51.903 47.335 55.094 45.846 M 54.639 42.727 C 51.743 44.227 48.47 45.09 45 45.09 s -6.743 -0.863 -9.639 -2.363 c -12.942 1.931 -22.952 13.162 -22.952 26.619 v 17.707 c 0 1.621 1.326 2.946 2.946 2.946 h 59.29 c 1.621 0 2.946 -1.326 2.946 -2.946 V 69.347 C 77.591 55.889 67.581 44.659 54.639 42.727 L 54.639 42.727 z' style='stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;' transform=' matrix(1 0 0 1 0 0) ' stroke-linecap='round' /%3E%3C/g%3E%3C/svg%3E");
        }
        #details {
          flex-grow: 1;
          padding-inline: 1em;
          padding-block: 0.5em;
        }
      `;
      this.shadowRoot.appendChild(styleElem);
    }
    let tmpData;
    if (this.dataset.info) {
      try {
        tmpData = JSON.parse(this.dataset.info);
      } catch (ex) {
        console.warn("Bad data in data-info:", this.dataset.info);
      }
    }
    this.update(tmpData || {});
  }
  update({
    loggedIn = false,
    authenticated = false,
    avatarUrl = "",
    displayName = "Anonymous"
  } = {}) {
    this.classList.toggle("logged-in", loggedIn);
    this.classList.toggle("authenticated", authenticated);
    this.loggedIn = loggedIn;
    this.authenticated = authenticated;
    this.avatarSrc = avatarUrl;
    this.displayName = displayName;
    console.log("Updating with displayName:", displayName, this.displayName);
    if (this.authenticated && avatarUrl) {
      this.avatarElem.style.backgroundImage = `url(${this.avatarSrc})`;
    }
    this.avatarElem.classList.toggle("anon", !(this.loggedIn && this.authenticated));
    this.detailsElem.textContent = this.displayName;
  }
}
customElements.define("user-info", UserInfo);

const LoginUI = window.LoginUI = new class _LoginUI {
  init(rootElem) {
    console.log("Init UI with rootElem:", rootElem);
    this.rootElem = rootElem;
    this.form = rootElem.querySelector("form");
    this.rootElem.addEventListener("click", this);
  }
  handleButtonClick(event) {
    event.preventDefault();
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
  update({ loggedIn, user } = {}) {
    this.displayStatus("Got auth update, loggedIn:" + loggedIn );
    this.rootElem.classList.toggle("logged-in", loggedIn);
    this.rootElem.querySelector("user-info").update({
      loggedIn,
      ...user,
    })
  }
}();

document.addEventListener("DOMContentLoaded", async () => {
  console.log("In DOMContentLoaded");
  const client = window.gameClient = connectClient();
  window.LoginUI.init(document.body);
  client.on("signedin", ({ user, idToken }) => {
    console.log("Client signedin, got idToken:", idToken);
    console.log("Client signedin, got user:", user);
    window.LoginUI.update({ loggedIn: true, user });
  });
  client.on("signedout", () => {
    window.LoginUI.update({ loggedIn: false });
  });
});

