const scenes = new Set();
export class UIScene extends HTMLElement {
  configure(options={}) {
    this.client = options.client;
    delete options.client;
    this.app = options.app;
    delete options.app;
    this.player = options.player;
    delete options.player;

    this.options = options;
    this._topics = new Set();
    this._active = false;
    this._configured = true;
  }
  connectedCallback() {
    this.classList.add("ui-scene", "hidden");
  }
  listen(name) {
    if (this._topics.has(name)) {
      return;
    }
    this._topics.add(name);
    this.ownerDocument.addEventListener(name, this);
  }
  removeListener(name) {
    this._topics.delete(name);
    this.ownerDocument.removeEventListener(name, this);
  }
  enter(params = {}) {
    this._active = true;
    if (params.client) {
      this.client = params.client;
    }
    if (params.game) {
      this.app = params.game;
    }
    this.addEventListener("click", this);
    this.classList.remove("hidden");
    this.ownerDocument.body.dataset.scene = this.id;
    console.log("Entering scene: ", this.id, this);
  }
  exit() {
    this._active = false;
    for (let topic of this._topics){
      this.removeListener(topic);
    }
    this.classList.add("hidden");
  }
  handleEvent(event) {
    let mname = 'on'+event.type[0].toUpperCase()+event.type.substring(1);
    if (typeof this[mname] == 'function') {
      this[mname].call(this, event);
    }
  }
}

/*
 * Initial scene checks configurations, server availability etc.
 * Forwards to Lobby scene if it all checks out
 */
export class InitializeScene extends UIScene {
  static name = "initialize-scene";
  enter(params = {}) {
    super.enter(params);
    this.checkConditions().then(result => {
      if (!result || !result.ok) {
        return this.statusNotOk(result);
      }
      this.statusOk(result);
    }).catch(ex =>{
      console.warn("Exception entering scene: ", ex);
      this.statusNotOk(ex);
    })
  }
  checkConditions() {
    return Promise.resolve({
      ok: true,
      user: null,
    });
  }
  async statusOk(statusData) {
    if (statusData.user) {
      this.app.switchScene("lobby", statusData);
    } else {
      this.app.requireLogin(statusData);
    }
  }
  statusNotOk(statusResult){
    if (statusResult && statusResult instanceof Error) {
      game.switchScene("notavailable", { heading: "Status Error", message: statusResult.message, });
    } else if (statusResult && !statusResult.ok) {
      // TODO: we do have more fine-grained status data available for a more accurate message?
      game.switchScene("notavailable", {
        heading: "Offline",
        message: "We are offline right now, please come back later",
      });
    }
  }
}
scenes.add(InitializeScene);

export class LobbyScene extends UIScene {
  static name = "lobby-scene";
  enter(params = {}) {
    console.log("LobbyState, got params", params);
    super.enter(params);
    console.log("Entered lobby scene");
    // this.userList = this.querySelector("#playersjoined");
    // this.addUser({ id: "playerone", name: "", placeholder: "Your name goes here" });


    // this.client.enrollUser().then(data => {
    //   for (let user of data.added) {
    //     this.addUser(Object.assign(user, { remote: true }));
    //   }
    // })
  }
}
scenes.add(LobbyScene);

export class GameScene extends UIScene {
  static name = "game-scene";
  async enter(params = {}) {
    super.enter(params);
    console.log("Entered Game Scene");
  }
}
scenes.add(GameScene);

class MessageScene extends UIScene {
  connectedCallback() {
    super.connectedCallback();
    this.heading = this.querySelector(".heading");
    this.message = this.querySelector(".message");
  }
  enter(_params) {
    const params = Object.assign({
      heading: "Not Available",
      message: "",
    }, _params);
    super.enter(params);
    console.log("Enter MessageScene, params:", params);

    if (params.titleText) {
      this.heading.textContent = params.titleText;
    } else {
      this.heading.textContent = params.heading;
    }
    if (params.contentFragment) {
      this.message.textContent = "";
      this.message.appendChild(params.contentFragment);
    } else {
      this.message.textContent = params.message;
    }
    if (params.className) {
      if (this.message.firstElementChild.hasAttribute("class")) {
        let node = this.querySelector(".body-upper");
        for (let cls of params.className.split(" ")) {
          node.classList.add(cls);
        }
      }
    }
    // if (typeof window.gtag == "function") {
    //   gtag('event', 'exception', {
    //     'description': params.errorCode || params.heading,
    //     'fatal': false,
    //   });
    // }
  }
  exit() {
    super.exit();
    this.querySelector(".body-upper").className = "body-upper";
  }
}
class NotAvailableScene extends MessageScene {
  static name = "notavailable-scene";
}
scenes.add(NotAvailableScene);

class GoodbyeScene extends MessageScene {
  static name = "goodbye-scene";
}
scenes.add(GoodbyeScene);

export function defineCustomElements(elementRegistry = window.customElements) {
  for (const SceneClass of scenes) {
    if (SceneClass.name) {
      elementRegistry.define(SceneClass.name, SceneClass);
    }
  }
}
if (window?.customElements) {
  defineCustomElements(window.customElements);
}