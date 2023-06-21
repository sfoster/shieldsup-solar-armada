import { EventEmitterMixin } from './event-emitter';
import { getDatabase, connectDatabaseEmulator, ref, child, onValue, get } from 'firebase/database';

let client;
export function useClient(_client) {
  client = _client;
}
let db;
export function useDatabase(_db) {
  db = _db;
}

export class RemoteObject extends EventEmitterMixin(Object) {
  constructor(path) {
    super();
    this._path = path;
    // Object.defineProperty(this, 'dbRef', {
    //   value: db ? ref(db, this.path) : null,
    //   writable: false
    // });
  }
  get dbRef() {
    return db ? ref(db, this.path) : null;
  }
  get path() {
    return this._path;
  }
  setPath(value) {
    this._path = value;
    if (this._unsubscriber) {
      this.unwatch();
    }
    return this.watch();
  }
  on(...args) {
    super.on(...args);
    this.watch();
  }
  watch() {
    if (!client.connected) {
      console.warn("Client isn't connected");
      return;
    }
    if (!this.path) {
      console.warn("No db path defined");
      return;
    }
    this.unwatch();
    this._unsubscriber = onValue(this.dbRef, (snapshot) => {
      this.onSnapshot(snapshot);
      console.log(`${this.constructor.name}/${this.path}, onValue, called onSnapshot`);
    });
  }
  unwatch() {
    if (this._unsubscriber) {
      this._unsubscriber();
    }
  }
  onSnapshot(snapshot) {
    this._lastResult = snapshot.val();
    let result = Object.assign({}, this._lastResult);
    this.emit("value", result, this);
  }
  getProperty(pname) {
    return this._lastResult ? this._lastResult[pname] : undefined;
  }
  handleTopic(topic) {
    console.log("handleTopic:", topic);
  }
};

export class RemoteList extends RemoteObject {
  onSnapshot(snapshot) {
    const results = [];
    this.byPath = new Map();
    snapshot.forEach((childSnapshot) => {
      const itemData = { key: childSnapshot.key, value: childSnapshot.val()};
      results.push(itemData);
      this.byPath.set(itemData.key, itemData);
    });
    this.resultsCount = results.length;
    console.log(`${this.constructor.name}/${this.path}, onSnapshot, emiting value:`, results);
    this.emit("value", results);
  }
}
