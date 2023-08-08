import { RemoteList, RemoteObject } from './collections';
import { addAssets, addEntities, thawScene } from './aframe-helpers';

export class AframeSceneManager {
  constructor() {
    this.sceneDocument = new RemoteList();
    this.staticScenesMap = new Map();
  }
  registerStatic(name, sceneData) {
    this.staticScenesMap.add(name, sceneData);
  }
  handleTopic(topic, data, target) {
    if (target == this.sceneDocument) {
      console.log("Handling update of sceneDocument:", data);
      this.loadScene(data);
    }
  }
  loadStaticScene(sceneId, sceneData) {
    if (sceneId !== this._currentStaticId) {
      this._sceneData = sceneData;
      this._currentStaticId = sceneId;
      this._loadScene();
    }
  }
  selectScene(sceneId) {
    delete this._currentStaticId;
    this.sceneDocument?.off("value", this);

    const scenePath = `scenes/${sceneId}`;
    console.log("selectScene, setting path:", scenePath)
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
    let newScene = document.createElement("a-scene");
    afScene.parentNode.replaceChild(newScene, afScene);
    if (afScene.renderer) {
      // aframe already do scene.renderer.xr.dispose(); when the scene is
      // detached but this doesn't stop properly the animation loop,
      // renderer.dispose() calls xr.dispose() and animation.stop()
      afScene.renderer.dispose();
    }
    console.log("after _clearScene:", document.querySelector("a-scene").children);
    return newScene;
  }
  _loadScene() {
    const afScene = this._clearScene(document.querySelector("a-scene"));

    let [remoteAssets, remoteEntities] = this._sceneData;
    console.log("Updating scene with data:", remoteAssets, remoteEntities);
    let assetsList = Object.values(remoteAssets.value);
    let entitiesList = Object.values(remoteEntities.value);
    thawScene({
      assets: assetsList,
      entities: entitiesList
    }, afScene);

  }
}