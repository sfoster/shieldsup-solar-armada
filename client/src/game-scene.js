import { RemoteList, RemoteObject } from './collections';
import { UIScene } from './ui-scene';
import { html } from 'lit';

export class GameScene extends UIScene {
  static sceneName = "game-scene";
  static properties = {
    gameId: {type: String},
  };
  async enter(params = {}) {
    super.enter(params);
    this.classList.add("collapsed");
    const uiLayer = this.ownerDocument.querySelector("#ui-layer");
    uiLayer.classList.add("docked");
    uiLayer.querySelector("player-card").classList.add("collapsed");

    console.assert(params.gameId, "Entered Game Scene with gameId");
    this.gameDocument = new RemoteObject(`games/${params.gameId}`);
    this.gameDocument.on("value", this);
    this._exitTasks.push(() => {
      this.gameDocument.off("value", this);
    });
    this.gameId = params.gameId;
  }
  exit() {
    this.ownerDocument.querySelector("#ui-layer").classList.remove("docked");
    super.exit();
  }
  handleTopic(topic, data, target) {
    switch (topic) {
      case "value":
        console.log("Handling value topic:", data);
        if (target == this.client.playerDocument) {
          console.log("Handling update of playerDocument", data);
        } else if (target == this.gameDocument) {
          console.log("Handling update of gameDocument:", data);
          if (data.sceneId) {
            this.app.afSceneManager.selectScene(data.sceneId);
          }
        }
        break;
    }
  }
  onLeaveClick(event) {
    console.log("onLeaveClick:", event);
    this.client.leaveGame();
  }
  render() {
    return html`
      <link rel="StyleSheet" href="./game-scene.css">
      <div class="toolbar" part="toolbar">
        <span id="gameLabel">${this.gameId}</span>
        <button id="leaveBtn" @click="${this.onLeaveClick}">Leave</button>
      </div>
      `;
  }
}
UIScene.registerScene(GameScene);
