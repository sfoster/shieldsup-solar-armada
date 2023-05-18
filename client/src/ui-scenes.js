import { UIScene } from './ui-scene';
import { html } from 'lit';

/*
 * Initial scene checks configurations, server availability etc.
 * Forwards to Lobby scene if it all checks out
 */
export class InitializeScene extends UIScene {
  static sceneName = "initialize-scene";
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
    if (this.client?.auth?.connected) {
      return Promise.resolve(new Error("Client not authenticated"));
    }
    if (!this.client?.userModel?.loggedIn) {
      return Promise.resolve(new Error("User not logged in"));
    }
    if (!this.client?.userModel?.validated) {
      return Promise.resolve(new Error("User not validated"));
    }
    return Promise.resolve({
      ok: true,
      user: this.client.userModel,
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
      if (statusResult.message.includes("not logged in")) {
        this.app.switchScene("login");
        return;
      }
      this.app.switchScene("notavailable", { heading: "Status Error", message: statusResult.message, });
    } else if (statusResult && !statusResult.ok) {
      // TODO: we do have more fine-grained status data available for a more accurate message?
      this.app.switchScene("notavailable", {
        heading: "Offline",
        message: "We are offline right now, please come back later",
      });
    }
  }
}
UIScene.scenes.add(InitializeScene);

export class GameScene extends UIScene {
  static sceneName = "game-scene";
  async enter(params = {}) {
    super.enter(params);
    console.log("Entered Game Scene");
  }
}
UIScene.scenes.add(GameScene);

class MessageScene extends UIScene {
  // get heading() {
  //   return this.shadowRoot.querySelector(".heading");
  // }
  // get message() {
  //   return this.shadowRoot.querySelector(".message");
  // }
  static properties = {
    heading: {type: String},
    message: {type: String},
  };
  connectedCallback() {
    let tmpHeading = this.querySelector(".heading");
    let tmpMessage = this.querySelector(".message");
    for (let contentName of ["heading", "message"]) {
      let tmpElem = this.querySelector(`.${contentName}`);
      let textContent = tmpElem?.textContent?.trim();
      if (textContent) {
        this[contentName] = textContent;
      }
    }
    super.connectedCallback();
  }
  enter(_params) {
    const params = Object.assign({
      heading: "Not Available",
      message: "",
    }, _params);
    if (_params.heading) {
      this.heading = _params.heading;
    } else if (!this.heading) {
      this.heading = "Not Available";
    }
    if (_params.message) {
      this.message = _params.message;
    } else if (!this.message) {
      this.message = "";
    }
    super.enter(params);
  }
  render() {
    this.classList.add("ui-scene");
    this.classList.toggle("hidden", this.hidden);

    return html `
    <slot></slot>
    `;
  }
}
// don't add this base class to UIScene.scenes

class NotAvailableScene extends MessageScene {
  static sceneName = "notavailable-scene";
}
UIScene.scenes.add(NotAvailableScene);

class GoodbyeScene extends MessageScene {
  static sceneName = "goodbye-scene";
}
UIScene.scenes.add(GoodbyeScene);
