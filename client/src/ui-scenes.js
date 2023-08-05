import { UIScene } from './ui-scene';
import { html } from 'lit';

/*
 * Initial scene checks configurations and waits for initialization
 * Forwards to Login scene if it all checks out
 */

export class InitializeScene extends UIScene {
  static sceneName = "initialize-scene";
  enter(params = {}) {
    super.enter(params);
    this.checkConditions();
  }
  checkConditions() {
    /*
     * Once the client is initialized, go to login page
     * On failure, show the error page
    */
    console.log("InitiializeScene#checkConditions, waiting for client.initializingPromise");
    this.client.initializingPromise.then(() => {
      console.log("InitiializeScene#checkConditions, client.initializingPromise resolved, client", this.client);
      return this.statusOk();
    }).catch(ex => {
      return this.statusNotOk(ex);
    });
  }
  async statusOk() {
    // initialized successfully, so proceed to login page
    this.app.switchScene("login");
  }
  statusNotOk(statusResult){
    console.log("statusNotOk:", statusResult);
    if (statusResult && statusResult instanceof Error) {
      this.app.switchScene("notavailable", { heading: "Status Error", message: statusResult.message, });
    } else if (statusResult && !statusResult.ok) {
      // TODO: we could get more fine-grained status data available for a better message?
      this.app.switchScene("notavailable", {
        heading: "Oops",
        message: "Yeah, dunno. Try again maybe?",
      });
    }
  }
}
UIScene.registerScene(InitializeScene);

class MessageScene extends UIScene {
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
