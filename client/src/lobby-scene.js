import { UIScene } from './ui-scene';
import { RemoteList } from './collections';
import { html } from 'lit';

export class LobbyScene extends UIScene {
  static sceneName = "lobby-scene";
  constructor() {
    super();
    this.collections = new Map();
  }
  enter(params = {}) {
    console.log("LobbyScene, got params", params);
    super.enter(params);
    const { userLoggedIn } = this.client;
    console.log("Entered lobby scene, hidden:", this.hidden, userLoggedIn);

    requestAnimationFrame(() => {
      UIScene.initCollectionBackedElements(this, this.collections, { disabled: !userLoggedIn });
      console.log("Entered lobby scene, rAF, hidden:", this.hidden);
    });

    this.addEventListener("item-click", this);
    // const gamesCollection = this.collections.get("games-list");
    // console.log("Adding value listener for the gamesCollection");
    // // see if our user shows up as a player in one of the games
    // gamesCollection?.on("value", (gamesEntries) => {
    //   console.log("gamesCollection.on callback, gamesEntries:", gamesEntries);
    //   for (let [gameId, entry] of Object.entries(gamesEntries)) {
    //     if (entry.players && entry.players.find(player => player.displayName == this.client.userModel.displayName)) {
    //       requestAnimationFrame(() => {
    //         this.app.switchScene("game", { gameId });
    //       });
    //       return;
    //     }
    //   }
    // });
    this.requestUpdate();
  }
  exit() {
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

