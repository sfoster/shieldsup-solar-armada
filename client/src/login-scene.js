// src/login-scene.js
import { GameClient } from './game-client';
import { UIScene } from './ui-scene';
import { html } from 'lit';

class UserInfo extends HTMLElement {
  static defaultAvatarSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1' width='256' height='256' viewBox='0 0 256 256' xml:space='preserve'%3E%3Cg style='stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;' transform='translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)' %3E%3Cpath d='M 45 3 c 7.785 0 14.118 6.333 14.118 14.118 v 6.139 c 0 7.785 -6.333 14.118 -14.118 14.118 c -7.785 0 -14.118 -6.333 -14.118 -14.118 v -6.139 C 30.882 9.333 37.215 3 45 3 M 45 0 L 45 0 c -9.415 0 -17.118 7.703 -17.118 17.118 v 6.139 c 0 9.415 7.703 17.118 17.118 17.118 h 0 c 9.415 0 17.118 -7.703 17.118 -17.118 v -6.139 C 62.118 7.703 54.415 0 45 0 L 45 0 z' style='stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;' transform=' matrix(1 0 0 1 0 0) ' stroke-linecap='round' /%3E%3Cpath d='M 55.094 45.846 c 11.177 2.112 19.497 12.057 19.497 23.501 V 87 H 15.409 V 69.347 c 0 -11.444 8.32 -21.389 19.497 -23.501 C 38.097 47.335 41.488 48.09 45 48.09 S 51.903 47.335 55.094 45.846 M 54.639 42.727 C 51.743 44.227 48.47 45.09 45 45.09 s -6.743 -0.863 -9.639 -2.363 c -12.942 1.931 -22.952 13.162 -22.952 26.619 v 17.707 c 0 1.621 1.326 2.946 2.946 2.946 h 59.29 c 1.621 0 2.946 -1.326 2.946 -2.946 V 69.347 C 77.591 55.889 67.581 44.659 54.639 42.727 L 54.639 42.727 z' style='stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;' transform=' matrix(1 0 0 1 0 0) ' stroke-linecap='round' /%3E%3C/g%3E%3C/svg%3E";
  constructor() {
    super();
    this.avatarSrc = this.constructor.defaultAvatarSrc;
    this.details = "";
  }
  get avatarElem() {
    return this.shadowRoot.querySelector("#avatar");
  }
  get detailsElem() {
    return this.shadowRoot.querySelector("#details");
  }
  set userModel(userModel) {
    this._userModel = userModel;
    this.update()
  }
  get userModel() {
    return this._userModel || {};
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
        :host #avatar {
          background-image: var(--avatar-image);
        }
        #details {
          flex-grow: 1;
          padding-inline: 1em;
          padding-block: 0.5em;
        }
      `;
      this.shadowRoot.appendChild(styleElem);
    }
    console.log(`connectedCallback(), --avatar-image: ${this.style.getPropertyValue("--avatar-image")}`);
    this.update({});
  }
  update() {
    for (let pname of ["loggedIn", "validated", "displayName", "isAnonymous"]) {
      if (typeof this.userModel[pname] !== "undefined") {
        this[pname] = this.userModel[pname];
      }
    }
    if (!this.loggedIn) {
      this.validated = false;
      this.displayName = "";
      this.isAnonymous = false;
      this.avatarSrc = this.constructor.defaultAvatarSrc;
    } else {
      if (this.userModel.avatarSrc) {
        console.log("updating this.avatarSrc");
        this.avatarSrc = avatarSrc;
      }
    }
    this.classList.toggle("logged-in", this.loggedIn);
    this.classList.toggle("validated", this.validated);
    let anonymousUser = this.isAnonymous && this.loggedIn;
    let fillColor = (this.loggedIn && !anonymousUser) ? "rgb(0,0,0)" : "rgb(155,155,155)";
    let backgroundImageValue = `url("${this.avatarSrc.replaceAll('rgb(0,0,0)', fillColor)}"`;
    this.style.setProperty("--avatar-image", backgroundImageValue);
    if (this.isAnonymous) {
      this.displayName = "Anonymous";
    }
    // console.log(`update(), displayName: ${this.displayName}, backgroundImageValue: ${backgroundImageValue}`);
    // console.log(`--avatar-image: ${this.style.getPropertyValue("--avatar-image")}`);
    this.avatarElem.classList.toggle("anon", !(this.loggedIn || this.validated));
    let authLabel = this.loggedIn ?
      `(${this.validated ? "validated" : "not validated"})` :
      "";
    this.detailsElem.textContent = `${this.displayName} ${authLabel}`;
  }
}
customElements.define("user-info", UserInfo);

export class LoginScene extends UIScene {
  static sceneName = "login-scene";
  static properties = {
    statusMessages: {},
  };
  constructor() {
    super();
    this.userModel = {};
    this.statusMessages = ["initial status"];
  }
  get userInfo() {
    return this.querySelector("user-info");
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
    const client = this.client;
    const userInfo = this.userInfo;
    userInfo.userModel = client.userModel;
    this.userModel = client.userModel;

    this.addEventListener("click", this);
    console.log("registered click event listener in LoginScene#enter");
    client.on("signedin", ({ user, idToken }) => {
      console.log("Client signedin, got idToken:", idToken);
      console.log("Client signedin, got user:", user);
      userInfo.update();
      this.onUserInfoUpdate();
    });
    client.on("signedout", () => {
      userInfo.update();
      console.log("Client signed out");
      this.onUserInfoUpdate();
    });
    client.on("uservalidated", (result) => {
      console.log("uservalidated received", result);
      this.onUserInfoUpdate();
    });
    client.on("usernotvalidated", (result) => {
      console.log("usernotvalidated received", result);
      this.onUserInfoUpdate();
    });
  }
  exit() {
    this.removeEventListener("click", this);
    super.exit();
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
    }
  }
  displayStatus(statusValue) {
    this.statusMessages.push(statusValue);
  }
  onUserInfoUpdate() {
    this.displayStatus("Got auth update, loggedIn:" + this.userModel.loggedIn );
    if (this.userModel.loggedIn && this.userModel.validated) {
      this.app.switchScene("lobby");
      return;
    }
    this.requestUpdate();
  }
  render() {
    this.classList.add("ui-scene");
    this.classList.toggle("hidden", this.hidden);

    const userModel = this.userModel;
    console.log("LoginUI, rootElem.className:", this.className);
    this.classList.toggle("logged-in", userModel.loggedIn);
    console.log("LoginUI, logged-in toggled, this.className:", this.className, userModel.loggedIn, userModel.validated);
    this.classList.toggle("validated", userModel.validated);
    console.log("LoginUI, validated toggled, this.className:", this.className, userModel.validated);

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
UIScene.scenes.add(LoginScene);
