import { RemoteObject } from './collections';
import { LitElement, html, css, ifDefined } from 'lit';

export class PlayerCard extends LitElement {
  static properties = {
    hidden: {state: true},
    displayName: {},
    description: {},
    gameName: {},
    gameId: {},
  }
  static defaultAvatarSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1' width='256' height='256' viewBox='0 0 256 256' xml:space='preserve'%3E%3Cg style='stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;' transform='translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)' %3E%3Cpath d='M 45 3 c 7.785 0 14.118 6.333 14.118 14.118 v 6.139 c 0 7.785 -6.333 14.118 -14.118 14.118 c -7.785 0 -14.118 -6.333 -14.118 -14.118 v -6.139 C 30.882 9.333 37.215 3 45 3 M 45 0 L 45 0 c -9.415 0 -17.118 7.703 -17.118 17.118 v 6.139 c 0 9.415 7.703 17.118 17.118 17.118 h 0 c 9.415 0 17.118 -7.703 17.118 -17.118 v -6.139 C 62.118 7.703 54.415 0 45 0 L 45 0 z' style='stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;' transform=' matrix(1 0 0 1 0 0) ' stroke-linecap='round' /%3E%3Cpath d='M 55.094 45.846 c 11.177 2.112 19.497 12.057 19.497 23.501 V 87 H 15.409 V 69.347 c 0 -11.444 8.32 -21.389 19.497 -23.501 C 38.097 47.335 41.488 48.09 45 48.09 S 51.903 47.335 55.094 45.846 M 54.639 42.727 C 51.743 44.227 48.47 45.09 45 45.09 s -6.743 -0.863 -9.639 -2.363 c -12.942 1.931 -22.952 13.162 -22.952 26.619 v 17.707 c 0 1.621 1.326 2.946 2.946 2.946 h 59.29 c 1.621 0 2.946 -1.326 2.946 -2.946 V 69.347 C 77.591 55.889 67.581 44.659 54.639 42.727 L 54.639 42.727 z' style='stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;' transform=' matrix(1 0 0 1 0 0) ' stroke-linecap='round' /%3E%3C/g%3E%3C/svg%3E";
  constructor() {
    super();
    this.avatarSrc = this.constructor.defaultAvatarSrc;
    this.description = "";
  }
  get avatarElem() {
    return this.shadowRoot.querySelector("#avatar");
  }
  get descriptionElem() {
    return this.shadowRoot.querySelector("#details");
  }
  get uid() {
    console.log("uid getter, currentUser:", this.client.auth.currentUser);
    this.client?.auth.currentUser.uid
  }
  get remoteDocument() {
    return this.client.playerDocument;
  }
  configure(options={}) {
    this.client = options.client;
    delete options.client;
    this.app = options.app;
    delete options.app;
    this._configured = true;
    this.client.on("signedin", this);
    this.client.on("signedout", this);
    this.requestUpdate();
  }
  handleTopic(topic, data) {
    console.log("Player handling topic:", topic, data);
    switch (topic) {
      case "value":
        console.log("Player remote document changed:", data);
        this.requestUpdate();
        break;
      case "signedin": {
        let { uid } = this.client.auth.currentUser;
        console.log("Player got signedin message, user id:", uid);
        this.remoteDocument.setPath(`players/${uid}`);
        this.remoteDocument.on("value", this);
        break;
      }
      case "signedout":
        this.remoteDocument.off("value", this);
        this.remoteDocument.unwatch(this);
        console.log("Player got signedout message");
        this.requestUpdate();
        break;
    }
  }
  firstUpdated() {
    console.log("PlayerCard first updated");
  }
  willUpdate() {
    let remoteUser = this.client?.auth.currentUser;
    this.avatarSrc = this.constructor.defaultAvatarSrc;
    this.isAnonymous = true;

    if (remoteUser) {
      this.displayName = remoteUser.isAnonymous ? "Anonymous" : remoteUser.displayName;
      this.loggedIn = true;
    } else {
      this.displayName = "(Not logged in)";
      this.loggedIn = false;
    }
    this.gameId = this.remoteDocument?.getProperty("gameId");
  }
  static stylesheetUrl = "./player-card.css";
  render() {
    let fillColor = (this.loggedIn && !this.anonymousUser) ? "rgb(0,0,0)" : "rgb(155,155,155)";
    let backgroundImageValue = `url("${this.avatarSrc.replaceAll('rgb(0,0,0)', fillColor)}"`;
    this.style.setProperty("--avatar-image", backgroundImageValue);
    this.classList.toggle("logged-in", this.loggedIn);
    return html`
    <link rel="stylesheet" href=${this.constructor.stylesheetUrl} />
    <div id="avatar"></div>
    <div id="details">
      <h1 id="player-name">${this.displayName}</h1>
      <p id="player-description">${this.description}</p>
      <p id="game-details" ?hidden="${!this.gameId}">Current game: ${this.gameId}</p>
    </div>
    `;
  }
}
window.customElements.define("player-card", PlayerCard);
