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
    const { loggedIn } = this.client;
    console.log("Entered lobby scene, loggedIn:", loggedIn);

    requestAnimationFrame(() => {
      UIScene.initCollectionBackedElements(this.shadowRoot, this.collections, { disabled: !loggedIn });
      this.requestUpdate();
    })

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
    return this.shadowRoot.querySelector("games-list");
  }
  get playersList() {
    return this.shadowRoot.querySelector("players-list");
  }
  render() {
    console.log("LobbyScene render");
    return html`
      <slot></slot>
      <games-list id="games-list" data-remoteid="games"></games-list>
      <doc-list id="players-list" data-remoteid="players"></doc-list>
    `;
  }
}
UIScene.registerScene(LobbyScene);

