// src/login-scene.js
import { UIScene } from './ui-scene';
import { html } from 'lit';

export class LoginScene extends UIScene {
  static sceneName = "login-scene";
  static properties = {
    statusMessages: {},
  };
  clientTopics = [
    "signedin",
    "signedout",
    "uservalidated",
    "usernotvalidated",
    "request/success",
    "request/failure",
  ];
  constructor() {
    super();
    this.statusMessages = ["initial status"];
    this.collections = new Map();
  }
  get playerCard() {
    return this.querySelector("player-card");
  }
  connectedCallback() {
    console.log("LoginScene#connectedCallback");
    super.connectedCallback();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this);
  }
  enter(params = {}) {
    console.log("LoginScene#enter got params:", params);
    console.log("LoginScene#enter has app, client:", this.app, this.client);

    super.enter(params);

    if (this.client.connected) {
      console.log("LoginScene, client is connected, initCollectionBackedElements");
      UIScene.initCollectionBackedElements(this, this.collections, { disabled: false });
    }

    this.addEventListener("click", this);
    for (let topic of this.clientTopics) {
      this.client.on(topic, this);
    }
  }
  exit() {
    this.removeEventListener("click", this);
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
  handleTopic(topic, data) {
    const playerCard = this.playerCard;
    switch (topic) {
      case "signedin": {
        const { user } = data;
        console.log("Client signedin, got user:", user);
        playerCard.update();
        this.onPlayerCardUpdate();
        UIScene.initCollectionBackedElements(this, this.collections, { disabled: false });
        break;
      }
      case "signedout": {
        this.playerCard.update();
        console.log("Client signed out");
        this.onPlayerCardUpdate();
        break;
      }
      case "uservalidated": {
        this.onPlayerCardUpdate();
        break;
      }
      case "usernotvalidated": {
        console.log("usernotvalidated received", data);
        this.onPlayerCardUpdate();
        break;
      }
      case "request/success": {
        this.displayStatus(data.status)
        break;
      }
      case "request/failure": {
        this.displayStatus(data.status)
        break;
      }
    }
  }

  onClick(event) {
    event.preventDefault();
    console.log("Handling click on target:", event.target.id);
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
      case "queueBtn":
        this.client.enqueueUser();
    }
  }
  displayStatus(statusValue) {
    let messages = this.statusMessages.slice(-9);
    this.statusMessages = [...messages, statusValue]
  }
  onPlayerCardUpdate() {
    /*
      | User                     |
      | =========================|
      | loggedIn (firebase auth) |
      | joined/validated         |
      |
    */
    this.displayStatus("Got auth update, loggedIn:" + this.client.userLoggedIn);
    if (this.client.userValidated) {
      this.app.switchScene("lobby");
      return;
    }
    this.requestUpdate();
  }
  render() {
    this.classList.add("ui-scene");
    this.classList.toggle("hidden", this.hidden);
    if (!this._active) {
      return;
    }

    this.classList.toggle("logged-in", this.client.auth.currentUser);
    this.classList.toggle("validated", this.client.userValidated);

    return html`
      <slot></slot>
      <footer>
        <ul id="status">
        ${this.statusMessages.map((message) =>
          html`<li>${message}</li>`
        )}
        </ul>
      </footer>
      `;
  }
}
UIScene.registerScene(LoginScene);
