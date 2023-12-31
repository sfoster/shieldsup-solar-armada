import { RemoteList, RemoteObject } from './collections';
import { addAssets, addEntities, thawScene } from './aframe-helpers';

export class AframeSceneManager {
  constructor() {
    this.sceneDocument = new RemoteList();
    this.staticScenesMap = new Map();
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
      this.selectScene(sceneId, true);
    }
  }
  selectScene(sceneId, isStatic) {
    delete this._currentStaticId;
    this._sceneLoadedPromise = new Promise(resolve => {
      this._sceneLoaded = () => {
        resolve();
        this._sceneLoaded = null;
        this._sceneLoadedPromise = null;
      }
    });
    console.log(`selectScene: ${sceneId}, isStatic: ${isStatic}`);
    if (isStatic) {
      this.sceneDocument?.disconnect();
      this._currentStaticId = sceneId;
      this._loadScene();
    } else {
      this.sceneDocument?.off("value", this);
      const scenePath = `scenes/${sceneId}`;
      console.log("selectScene, setting path:", scenePath)
      this.sceneDocument?.setPath(scenePath);
      this.sceneDocument?.on("value", this);
    }
    return this._sceneLoadedPromise;
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
    // if (afScene.renderer) {
    //   // aframe already do scene.renderer.xr.dispose(); when the scene is
    //   // detached but this doesn't stop properly the animation loop,
    //   // renderer.dispose() calls xr.dispose() and animation.stop()
    //   afScene.renderer.dispose();
    // }
    console.log("after _clearScene:", document.querySelector("a-scene").children);
    this.sceneElement = newScene;
    return newScene;
  }
  _loadScene() {
    const afScene = this._clearScene(document.querySelector("a-scene"));
    console.log("_loadScene, after _clearScene, scene has loaded? ", afScene.hasLoaded);

    let [remoteAssets, remoteEntities] = this._sceneData;
    console.log("Updating scene with data:", remoteAssets, remoteEntities);
    let assetsList = remoteAssets ? Object.values(remoteAssets.value) : [];
    let entitiesList = remoteEntities? Object.values(remoteEntities.value) : [];
    thawScene({
      assets: assetsList,
      entities: entitiesList
    }, afScene);
    console.log("_loadScene, after thawScene, scene has loaded? ", afScene.hasLoaded);
    if (!afScene.hasLoaded) {
      afScene.addEventListener("loaded", () => {
        console.log("_loadScene, onloaded handler, loaded? ", afScene.hasLoaded);
        if (typeof this._sceneLoaded == "function") {
          this._sceneLoaded(this.sceneElement);
        }
        }, { once: true });
    }
  }
}