export class UIApp {
  constructor(elem, options = {}) {
    this.elem = elem || document.body;
    this.options = options;
    this.scenes = {};
    this.currentScene = null;
    this.messageElem = null;
  }
  get messageList() {
    return this.elem.querySelector("#messages")
  }
  registerScene(name, scene) {
    this.scenes[name] = scene;
    console.log("registered scene:", name, scene);
  }
  switchScene(name, sceneParams = {}) {
    if (!this.scenes[name]) {
      throw new Error("Cant switch to unknown scene: " + name);
    }

    if (this.previousScene) {
      this.previousScene.classList.remove("previous");
      this.previousScene = null;
    }
    if (this.currentScene) {
      if (this.currentScene.id.startsWith("waiting")) {
        this.previousScene = this.currentScene;
      }
      this.currentScene.classList.remove("current");
      this.currentScene.exit();
    }
    if (this.previousScene) {
      this.previousScene.classList.add("previous");
    }
    this.currentScene = this.scenes[name];
    this.currentScene.enter(sceneParams);
  }
  showNotification(message) {
    console.log("Notification:", message);
  }
  showMessage(message) {
    const line = document.createElement("li");
    line.textContent = message;
    this.messageList.appendChild(line);
  }
  requireLogin(statusData) {
    console.log("requireLogin, got statusData:", statusData);
  }
}

