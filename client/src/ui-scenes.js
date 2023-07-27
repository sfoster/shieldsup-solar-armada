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
    /*
     * once the client is initialized, go direct to the login form if we have no firebase currentUser
     * If we do have a user, authenticate them at the server
     * We'll go to the login form in success and failure case for now in lieu of a player info screen
     * so the user can update display name, avatar etc before joining a game
    */
    console.log("InitiializeScene#checkConditions, waiting for client.initializingPromise");
    this.client.initializingPromise.then(() => {
      console.log("InitiializeScene#checkConditions, client.initializingPromise resolved, client", this.client);
      if (!this.client.connected) {
        console.log("InitiializeScene#checkConditions, not connected, calling statusOk");
        // no user, go straight to login
        console.log("checkConditions, auth request in-flight?", this.client.auth?.currentUser);
        return this.statusOk({ status: "Login needed" });
      }
      console.log("InitiializeScene#checkConditions, connected, calling ping()");
      this.client.ping().then(result => {
        console.log("InitiializeScene#checkConditions, calling ping() resolved, got result:", result);
        return this.statusOk(result);
      }).catch(result => {
        console.log("InitiializeScene#checkConditions, calling ping() errback, got result:", result);
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
    console.log("Entered Game Scene, got gameId:", params.gameId);
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
