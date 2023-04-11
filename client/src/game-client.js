import { getAuth, signOut, signInAnonymously, signInWithEmailAndPassword, connectAuthEmulator, onAuthStateChanged } from "firebase/auth";
import { EventEmitterMixin } from './event-emitter';
export class GameClient extends EventEmitterMixin(Object) {
  connected = false;
  init(firebaseApp) {
    console.log("in _Client.init");
    this.auth = getAuth(firebaseApp);
    connectAuthEmulator(this.auth, "http://localhost:9099");
    onAuthStateChanged(this.auth, (user) => {
      console.log("onAuthStateChanged:", user);
      if (user) {
        this.onUserAuthenticated(user);
      } else {
        this.onUserLogout();
      }
    });
  }
  async onUserAuthenticated(user) {
    console.assert(this.auth.currentUser == user, "user arg is auth's currentUser");
    this.currentUserIdToken = await user.getIdToken();
    this.currentUser = user;
    this.connected = true;
    this.emit("signedin", { user: this.currentUser, idToken: this.currentUserIdToken });
  }
  onUserLogout() {
    this.connected = false;
    delete this.currentUser;
    delete this.currentUserIdToken;
    this.emit("signedout");
  }
  logout() {
    return signOut(this.auth);
  }
  login(userid, password) {
    console.log("login, with:", userid, password);
    if (!userid) {
      console.log("in login, calling signInAnonymously");
      signInAnonymously(this.auth).catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        client.emit("error", { errorCode, errorMessage });
      });
    } else {
      console.log("in login, calling signInWithEmailAndPassword");
      signInWithEmailAndPassword(this.auth, userid, password).then(result => {
        console.log("Success from signInWithEmailAndPassword:", result);
      }).catch(error => {
        console.warn("error from signInWithEmailAndPassword", error);
      });
    }
  }
  updateEntity(path, data) {
    if (!(this.connected && this.currentUser)) {
      console.info("User not logged in and/or client not connected");
      return;
    }
    const url = `/api/${path}`;
    return this._apiRequest(url, "PUT", data);
  }
  async _apiRequest(url, method, payload) {
    console.log(`Sending request to update: ${url} with: ${JSON.toString(payload)}`);
    let resp = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // TODO: Use Authorization header or add the token into this request envelope?
      body: JSON.stringify({
        data: payload,
        credential: `token=${this.currentUserIdToken}`,
      })
    });
    let result;
    try {
      result = await resp.json();
    } catch (ex) {
      result = { status: resp.statusText }
    }
    if (resp.ok) {
      this.emit("request/success", result);
    } else {
      this.emit("request/failure", result);
      console.warn("error response:", resp);
    }
  }
};
