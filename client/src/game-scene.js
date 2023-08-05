import { RemoteList, RemoteObject } from './collections';
import { UIScene } from './ui-scene';
import { html } from 'lit';
import { addAssets, addEntities, thawScene } from './aframe-helpers';

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
    this.sceneDocument = new RemoteList();
    this.gameId = params.gameId;
  }
  exit() {
    this.ownerDocument.querySelector("#ui-layer").classList.remove("docked");
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
            this.selectScene(data.sceneId);
          }
        } else if (target == this.sceneDocument) {
          console.log("Handling update of sceneDocument:", data);
          this.loadScene(data);
        }
        break;
    }
  }
  selectScene(sceneId) {
    const scenePath = `scenes/${sceneId}`;
    console.log("selectScene, setting path:", scenePath)
    this.sceneDocument?.off("value", this);
    this.sceneDocument?.setPath(scenePath);
    this.sceneDocument?.on("value", this);
  }
loadScene(data) {
    this._sceneData = data;
    // debounce a bit
    this._loadSceneTimer = setTimeout(() => {
      this._loadScene();
    }, 500);
  }
  _clearScene(afScene) {
    for (let child of afScene.children) {
      if (child.localName == "a-assets") {
        child.textContent = "";
        continue;
      }
      child.remove();
    }
  }
  _loadScene() {
    const afScene = document.querySelector("a-scene");
    this._clearScene(afScene);

    let [remoteAssets, remoteEntities] = this._sceneData;
    console.log("Updating scene with data:", remoteAssets, remoteEntities);
    let assetsList = Object.values(remoteAssets.value);
    let entitiesList = Object.values(remoteEntities.value);
    thawScene({
      assets: assetsList,
      entities: entitiesList
    }, afScene);
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
