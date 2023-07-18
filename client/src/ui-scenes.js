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
    this.checkConditions();
  }
  checkConditions() {
    this.client.initializingPromise.then(() => {
      if (!this.client.connected) {
        // no user, go straight to login
        console.log("checkConditions, auth request in-flight?", this.client.auth?.currentUser);
        return this.statusOk({ status: "Login needed" });
      }
      this.client.ping().then(result => {
        return this.statusOk(result);
      }).catch(result => {
        switch (result.code) {
          case 401:
            // no credentials received
            return this.statusOk(result);
          case 403:
            // credentials received, but they didn't provide access
            return this.statusOk(result);
          default:
            return this.statusNotOk(result);
        }
      });
    });
  }
  async statusOk(statusData) {
    console.log("statusOk:", statusData);
    // made a succesful request, so proceed to login page
    this.app.switchScene("login", statusData);
  }
  statusNotOk(statusResult){
    console.log("statusNotOk:", statusResult);
    if (statusResult && statusResult instanceof Error) {
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
UIScene.registerScene(InitializeScene);

export class GameScene extends UIScene {
  static sceneName = "game-scene";
  async enter(params = {}) {
    super.enter(params);
    console.log("Entered Game Scene");
  }
}
UIScene.registerScene(GameScene);

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
UIScene.registerScene(NotAvailableScene);

class GoodbyeScene extends MessageScene {
  static sceneName = "goodbye-scene";
}
UIScene.registerScene(GoodbyeScene);
