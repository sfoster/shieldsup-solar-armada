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
    Object.defineProperty(this, 'dbRef', {
      value: db ? ref(db, this.path) : null,
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
    if (!client.connected) {
      console.warn("Client isn't connected");
      return;
    }
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
  handleTopic(topic) {
    console.log("handleTopic:", topic);
  }
};

export class RemoteList extends RemoteObject {
  onSnapshot(snapshot) {
    const results = [];
    snapshot.forEach((childSnapshot) => {
      results.push({ key: childSnapshot.key, value: childSnapshot.val()});
    });
    this.emit("value", results);
  }
}
