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
  handleEvent(event) {
    super.handleEvent(event);
    console.log("GameScene, handleEvent:", event.type);
    switch (event.type) {
      case "scene-targetable-click":
        console.log(`GameScene got event: ${event.type}, from entity: ${event.target.id}`);
        this.onTargetableClick(event.target.id);
        break;
    }
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
            this.app.afSceneManager.selectScene(data.sceneId).then(() => this.onSceneLoaded());
          }
        }
        break;
    }
  }
  onSceneLoaded() {
    console.log("Game scene loaded");
    let sceneElem = this.app.afSceneManager.sceneElement;
    let cursorElem = sceneElem.querySelector("[cursor]");
    if (cursorElem) {
      cursorElem.setAttribute("raycaster", "objects", ".hitme");
      cursorElem.setAttribute("cursor", "rayOrigin", "mouse");
      console.log("onSceneLoaded, adding raycaster to cursor entity:", cursorElem.components);
    }
    sceneElem.addEventListener("scene-targetable-click", this);
  }
  onLeaveClick(event) {
    console.log("onLeaveClick:", event);
    this.client.leaveGame();
  }
  onTargetableClick(entityId) {
    console.log("onTargetableClick, got entityId", entityId);
    let scenePath = this.app.afSceneManager.sceneDocument.path;
    this.client.damage(`${scenePath}/entities/${entityId}`, { durability: -50 });
  }
  render() {
    return html`
      <link rel="StyleSheet" href="./game-scene.css">
      <div class="toolbar" part="toolbar">
        <div class="toolbar-item">
          <span id="gameLabel" class="toolbar-label">${this.gameId}</span>
          <button id="leaveBtn" @click="${this.onLeaveClick}">Leave</button>
        </div>
      </div>
      `;
  }
}
UIScene.registerScene(GameScene);
