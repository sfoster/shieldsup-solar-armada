import { UIScene } from './ui-scene';
import { RemoteList } from './collections';
import { html } from 'lit';

export class LobbyScene extends UIScene {
  static sceneName = "lobby-scene";
  clientTopics = [
    "request/success",
    "request/failure",
  ];
  constructor() {
    super();
    this.collections = new Map();
  }
  enter(params = {}) {
    console.log("LobbyScene, got params", params);
    super.enter(params);
    const { userLoggedIn } = this.client;
    console.log("Entered lobby scene, hidden:", this.hidden, userLoggedIn);

    for (let topic of this.clientTopics) {
      this.client.on(topic, this);
    }

    requestAnimationFrame(() => {
      UIScene.initCollectionBackedElements(this, this.collections, { disabled: !userLoggedIn });
      console.log("Entered lobby scene, rAF, hidden:", this.hidden);
      this.client.playerDocument.on("value", this);
      this._exitTasks.push(() => {
        this.client.playerDocument.off("value", this);
      });
  });

    this.addEventListener("item-click", this);
    this.requestUpdate();
  }
  exit() {
    for (let topic of this.clientTopics) {
      this.client.off(topic, this);
    }
    for (let id of this.collections.keys()) {
      const elem = this.querySelector(`#${id}`);
      console.log("disconnecting collection-backed elem:", elem);
      elem.disconnectCollection(this);
    }
    this.collections.clear();
    super.exit();
  }
  handleEvent(event) {
    console.log("LobbyScene, handling event:", event.detail);
    if (event.type == "item-click") {
      const gameId = event.detail.key;
      this.client.joinGame(gameId);
    }
  }
  handleTopic(topic, data, target) {
    switch (topic) {
      case "value":
        console.log("Handling update of playerDocument:", data);
        if (target == this.client.playerDocument) {
          if (data.gameId) {
            this.app.switchScene("game", { gameId: data.gameId });
          }
        }
        break;
      default:
        console.log("Got unhandled topic:", topic, data);
        break;
    }
  }
  get gamesList() {
    return this.querySelector("games-list");
  }
  get playersList() {
    return this.querySelector("players-list");
  }
  render() {
    console.log(`${this.sceneName}, render(), active? ${this._active}`);
    if (!this._active) {
      return html`
        <slot></slot>
      `;
    }
    console.log("LobbyScene render");
    return html`
      <slot></slot>
    `;
  }
}
UIScene.registerScene(LobbyScene);

