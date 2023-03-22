// src/index.js
import { animate } from './animations';
import { DataList } from './datalist';
import { EventEmitterMixin } from './event-emitter';
import {LitElement, html} from 'lit';

import {
  firebaseConfig,
  firebaseEmulators,
  inEmulation,
} from './config';

import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator, ref, child, onValue, get } from 'firebase/database';
const firebaseApp = initializeApp({
  projectId: "api-test",
});
const db = getDatabase(firebaseApp, "http://localhost:9000/?ns=shieldsup-api-test");
if (inEmulation) {
  // Point to the RTDB emulator running on localhost.
  console.log("Connecting database emulator", firebaseEmulators.database.host, firebaseEmulators.database.port);
  connectDatabaseEmulator(db, firebaseEmulators.database.host, firebaseEmulators.database.port);
}

class RemoteObject extends EventEmitterMixin(Object) {
  constructor(path) {
    super();
    this._path = path;
    Object.defineProperty(this, 'dbRef', {
      value: ref(db, this.path),
      writable: false
    });
  }
  get path() {
    return this._path;
  }
  on(...args) {
    if (!this._watched) {
      this.watch();
    }
    return super.on(...args);
  }
  watch() {
    if (this._watched) {
      return;
    }
    onValue(this.dbRef, (snapshot) => {
      this.onSnapshot(snapshot);
    });
    this._watched = true;
  }
  onSnapshot(snapshot) {
    const result = snapshot.val();
    console.log("emitting on 'value':", result);
    this.emit("value", result);
    // snapshot.forEach((childSnapshot) => {
    //   results.push({ key: childSnapshot.key, value: childSnapshot.val()});
    // });
  }
};

function loadGame(name) {

  // const gameId = "thelatest";
  // return get(child(dbRef, `games/${gameId}`)).then((snapshot) => {
  //   if (snapshot.exists()) {
  //     console.log("snap exists");
  //     return snapshot.val();
  //   } else {
  //     console.log("snap doesnt exist");
  //     return new Error("No data available");
  //   }
  // });
}
class RemoteList extends RemoteObject {
  onSnapshot(snapshot) {
    const results = [];
    snapshot.forEach((childSnapshot) => {
      results.push({ key: childSnapshot.key, value: childSnapshot.val()});
    });
    this.emit("value", results);
  }
}

class DocumentsList extends LitElement {
  constructor() {
    super();
    this._viewDataList = [];
  }
  static properties = {
    remotePath: {},
  }
  connectedCallback() {
    super.connectedCallback();
    const remoteId = this.dataset.remoteId;
    console.log("connectedCallback, building model with remoteId", remoteId);
    if (remoteId) {
      this.model = new RemoteList(remoteId);
      this.model.on("value", this);
    }
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
    return html`<li>${JSON.stringify(data)}</li>`;
  }
  render() {
    return html `
    <ul>
      ${this._viewDataList.map((data) =>
        this.itemTemplate(data)
      )}
    </ul>`;
  }
}
customElements.define("doc-list", DocumentsList);
class GamesList extends DocumentsList {
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
customElements.define("games-list", GamesList);

class DocumentItem extends HTMLElement {
  constructor(model) {
    super();
    this.model = model;
  }
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
customElements.define("doc-item", DocumentItem);

document.addEventListener("DOMContentLoaded", async () => {
  console.log("In DOMContentLoaded");
  const latest = window.theLatest = new RemoteObject("games/thelatest");
  latest.on("value", (val) => {
    document.getElementById("datalabel").textContent = latest.path;
    document.getElementById("datainput").textContent = JSON.stringify({
      displayName: val.displayName
    }, null, 2);
    console.log(`Got value from ${latest.path}: ${JSON.stringify(val)}`);
  });
});

const putData = window.putData = async function(value) {
  const model = window.theLatest;
  const url = `/api/${model.path}`;
  let data;
  try {
    data = JSON.parse(value);
  } catch (ex) {
    console.warn("Bad data format, it should be valid JSON", ex);
    return;
  }
  console.log(`Sending request to update: ${url} with: ${value}`);
  let resp = await fetch(url, {
    method: "PUT",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (resp.ok) {
    console.log("Got ok response:", await resp.text());
    // displayResult(await resp.json());
  } else {
    console.warn("error response:", resp);
  }
}
