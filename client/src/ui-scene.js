import {LitElement, html} from 'lit';
import { RemoteList } from './collections';

export class UIScene extends LitElement {
  static scenes = new Set();
  get sceneName() {
    return this.constructor.sceneName;
  }
  static registerScene(SceneClass) {
    UIScene.scenes.add(SceneClass);
    console.log("registering SceneClass", SceneClass.sceneName);
    customElements.define(SceneClass.sceneName, SceneClass);
  }
  static initCollectionBackedElements(root, collections, { disabled }) {
    const remoteBackedElements = root.querySelectorAll("[data-remoteid]");
    console.log("remoteBackedElements:", remoteBackedElements.length);
    remoteBackedElements.forEach(elem => {
      if (elem.dataType == "list") {
        elem.disabled = disabled;
        if (!disabled) {
          if (!collections.has(elem.id)) {
            const collection = new RemoteList(elem.dataset.remoteid);
            collections.set(elem.id, collection);
            elem.setCollection(collection);
          }
        }
      }
    });
  }
  static properties = {
    hidden: {state: true},
  }
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
    console.log(this.sceneName + " configured, got:", this.app, this.client);
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
    this._exitTasks = [];
    this._active = true;
    if (params.client) {
      this.client = params.client;
    }
    if (params.game) {
      this.app = params.game;
    }
    this.ownerDocument.body.dataset.scene = this.id;
    console.log("Entering scene: ", this.id, this);
    this.hidden = false;
  }
  exit() {
    this._active = false;
    for (let topic of this._topics){
      this.removeListener(topic);
    }
    let taskFn;
    while (taskFn = this._exitTasks?.pop()) {
      taskFn();
    }
    this.hidden = true;
    console.log(`${this.sceneName} exit, hidden: ${this.hidden}, active: ${this._active}`);
  }
  handleEvent(event) {
    console.log("handleEvent:", event);
    let mname = 'on'+event.type[0].toUpperCase()+event.type.substring(1);
    if (typeof this[mname] == 'function') {
      this[mname].call(this, event);
    }
  }
  connectedCallback() {
    console.log("UIScene connectedCallback:", this.constructor.name);
    super.connectedCallback();
    this.classList.add("ui-scene");
  }
  render() {
    return html `
    <slot></slot>
    `;
  }
}

export function defineCustomElements(elementRegistry = window.customElements) {
  for (const SceneClass of UIScene.scenes) {
    if (SceneClass.name) {
      elementRegistry.define(SceneClass.name, SceneClass);
    }
  }
}
