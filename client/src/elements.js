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
    this.disabled = false;
  }
  disconnectCollection() {
    this.collection.off("value", this);
  }
  prepareViewData(results) {
    console.log("Got results:", results);
    this._viewDataList = results.map(({ key, value: docData }) => {
      return {
        key,
        ...docData,
        path: `${this.collection.path}/${key}`,
      }
    });
  }
  handleEvent(event) {
    const newEvent = new CustomEvent(`item-${event.type}`, {
      bubbles: true,
      composed: true,
      detail: { ...event.target.dataset }
    });
    this.dispatchEvent(newEvent);
  }
  handleTopic(topic, results) {
    console.log("Got update to my list:", topic, results);
    this.prepareViewData(results);
    this.requestUpdate();
  }
  itemTemplate(data) {
    return html`<li data-key="${data.key}" data-path="${data.path}">${data.displayName}</li>`;
  }
  render() {
    console.log("Rendering DocumentsList, ", this._viewDataList);
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
    <ul @click=${this} class="${this.disabled ? 'disabled' : '' }">
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
    let viewData = [];
    for (let keyValue of results) {
      let { key, value: docData } = keyValue;
      let viewModel = {
        key,
        ...docData,
        path: `${this.collection.path}/${key}`,
        // displayName: docData.displayName,
        playerCount: docData.players ? Object.keys(docData.players).length : 0,
      };
      console.log("prepared gameslist item viewModel:", viewModel);
      viewData.push(viewModel);
    }
    this._viewDataList = viewData;
  }
  itemTemplate(data) {
    return html`<li data-key="${data.key}" data-path="${data.path}">${data.displayName || data.gameId} (${data.playerCount})</li>`;
  }
}
