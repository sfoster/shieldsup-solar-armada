import {LitElement, html} from 'lit';

export class DocumentsList extends LitElement {
  dataType = "list";
  constructor() {
    super();
    this._viewDataList = [];
  }
  static properties = {
    remotePath: {},
    disabled: {},
  }
  connectedCallback() {
    super.connectedCallback();
    const remoteId = this.dataset.remoteId;
    console.log(`connectedCallback, type: ${this.dataType}, has remoteId: ${remoteId}`);
  }
  setCollection(collection) {
    if (this.collection) {
      this.collection.off("value", this);
    }
    this.collection = collection;
    console.log("setCollection:", this.collection);
    this.collection.on("value", this);
  }
  prepareViewData(results) {
    this._viewDataList = results.map(({ key, value: docData }) => docData);
  }
  handleTopic(topic, results) {
    console.log("Got update to my list:", results);
    this.prepareViewData(results);
    this.requestUpdate();
  }
  itemTemplate(data) {
    return html`<li>${data.displayName}</li>`;
  }
  render() {
    return html `
    <style>
      ul {
        padding: 0
      }
      ul.disabled {
        opacity: 0.5;
      }
      li {
        padding: .1em 0.5em;
        list-style-type: none;
        border: 1px solid;
        border-radius: 4px;
        margin: 0.2em;
      }
    </style>
    <ul class="${this.disabled ? 'disabled' : '' }">
      ${this._viewDataList.map((data) =>
        this.itemTemplate(data)
      )}
    </ul>`;
  }
}

export class DocumentItem extends HTMLElement {
  dataType = "item";
  handleTopic(topic, data) {
    this.update();
    this.render();
  }
  update(data) {
    this._viewData = data;
  }
  render() {
    this.textContent = JSON.stringify(this._viewData, null, 2);
  }
}

export class GamesList extends DocumentsList {
  prepareViewData(results) {
    this._viewDataList = results.map(({ key, value: docData }) => {
      console.log("creating view-model from:", docData);
      return {
        displayName: docData.displayName,
        playerCount: Object.keys(docData.players).length,
      };
    });
  }
  itemTemplate(data) {
    return html`<li>${data.displayName} (${data.playerCount})</li>`
  }
}

