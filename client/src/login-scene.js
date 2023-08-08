// src/login-scene.js
import { UIScene } from './ui-scene';
import { html } from 'lit';

export class LoginScene extends UIScene {
  static sceneName = "login-scene";
  static properties = {
    statusMessages: {},
  };
  clientTopics = [
    "uservalidated",
    "usernotvalidated",
    "request/success",
    "request/failure",
  ];
  constructor() {
    super();
    this.statusMessages = [];
    this.collections = new Map();
  }
  get playerCard() {
    return this.querySelector("player-card");
  }
  get signedIn() {
    return this.client.connected;
  }
  enter(params = {}) {
    super.enter(params);
    this.statusMessages = [];

    if (this.client.connected) {
      console.log("LoginScene, client is connected, initCollectionBackedElements");
      UIScene.initCollectionBackedElements(this, this.collections, { disabled: false });
    }
    this.client.playerDocument.on("value", this);
    this._exitTasks.push(() => {
      this.client.playerDocument.off("value", this);
    });
    for (let topic of this.clientTopics) {
      this.client.on(topic, this);
    }
    document.querySelector("player-card").classList.remove("hidden");
    if (params?.status) {
        console.log("LoginScene#enter, got params.status", params.status);
        // only display unauthorized message if its unexpected
        if (!this.client.auth.currentUser && params.status == "unauthorized") {
          return;
        }
        this.displayStatus(params?.status);
    }
  }
  exit() {
    for (let topic of this.clientTopics) {
      this.client.off(topic, this);
    }
    for (let id of this.collections.keys()) {
      const elem = this.querySelector(`#${id}`);
      console.log("disconnecting collection-backed elem:", elem);
      elem.disconnectCollection();
    }
    super.exit();
  }
  handleTopic(topic, data, target) {
    const playerCard = this.playerCard;
    switch (topic) {
      case "request/success": {
        this.displayStatus(data.status)
        break;
      }
      case "request/failure": {
        this.displayStatus(data.status)
        break;
      }
      case "value":
        console.log("Handling value topic:", data);
        if (target == this.client.playerDocument) {
          console.log("Handling update of playerDocument:", this.client.userInQueue);
          if (this.client.userInGame || this.client.userInQueue) {
            this.app.switchScene("lobby");
          }
        }
        break;
    }
  }

  onClick(event) {
    let targetId = (event.originalTarget || event.target).id;
    console.log("clicked on:", targetId);
    switch (targetId) {
      case "loginBtn": {
        let uname = this.shadowRoot.querySelector("#username").value;
        let pword = this.shadowRoot.querySelector("#password").value;
        this.client.login(uname, pword);
        // "test@example.com", "testy1"
        break;
      }
      case "anonLoginBtn":
        this.client.login();
        break;
      case "logoutBtn":
        this.client.logout();
        break;
      case "validateBtn":
        this.client.validateUser();
        break;
      case "queueBtn":
        this.client.enqueueUser();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }
  displayStatus(statusValue) {
    let messages = this.statusMessages.slice(0, 1);
    this.statusMessages = [statusValue, ...messages];
  }
  render() {
    if (!this._active) {
      return "";
    }
    this.classList.toggle("logged-in", this.client.auth.currentUser);
    this.classList.toggle("validated", this.client.userValidated);

    return html`
      <link rel="StyleSheet" href="./login-scene.css">
      <link rel="StyleSheet" href="./login-form.css">
      <section>
        <ul id="status" class="message-list">
        ${this.statusMessages.map((message) =>
          html`<li>${message}</li>`
        )}
        </ul>
      </section>
      <div class="form-container">
        ${this.client.auth.currentUser?
          "":
          html`
          <p class="form-row">
            <label for="username">Username</label>
            <input type="text" placeholder="Email or name" id="username">
          </p>
          <p class="form-row">
            <label for="password">Password</label>
            <input type="password" placeholder="Password" id="password">
          </p>
          `
        }
        <div class="toolbar">
        ${this.client.auth.currentUser?
          html`
          <button id="queueBtn" @click="${this.onClick}">Join</button>
          <button id="logoutBtn" @click="${this.onClick}">Logout</button>
          `:
          html`
          <button id="loginBtn" @click="${this.onClick}">Firebase Auth Login (email)</button>
          `
        }
        </div>
        <p class="hidden">
          <label for="no-override"><input type="radio" name="override-url" id="no-override" checked value="">No override</label>
          <label for="unauthorized-override"><input type="radio" name="override-url" id="unauthorized-override" value="/api/unauthorized">401 Unauthorized</label>
          <label for="forbidden-override"><input type="radio" name="override-url" id="forbidden-override" value="/api/forbidden">403 Forbidden</label>
          <textarea id="datainput" style="width:80%; height: 10rem"></textarea>
        </p>
      </div>
      <slot></slot>
      `;
  }
}
UIScene.registerScene(LoginScene);
