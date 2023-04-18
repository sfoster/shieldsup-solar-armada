import { getAuth, signOut, signInAnonymously, signInWithEmailAndPassword, connectAuthEmulator, onAuthStateChanged } from "firebase/auth";
import { EventEmitterMixin } from './event-emitter';
export class GameClient extends EventEmitterMixin(Object) {
  connected = false;
  urlPrefix = "/api";
  overrideUrl;
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
  createUrl(resourcePath) {
    return `${this.overrideUrl ?? this.urlPrefix}/${resourcePath}`;
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
    console.log("doing logout");
    return signOut(this.auth);
  }
  login(userid, password) {
    console.log("login, with:", userid, password);
    if (!userid) {
      console.log("in login, calling signInAnonymously");
      signInAnonymously(this.auth).catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        this.emit("error", { errorCode, errorMessage });
      });
    } else {
      console.log("in login, calling signInWithEmailAndPassword");
      signInWithEmailAndPassword(this.auth, userid, password).then(result => {
        console.log("Success from signInWithEmailAndPassword:", result);
      }).catch(error => {
        const errorCode = error.code;
        const errorMessage = error.message;
        this.emit("error", { errorCode, errorMessage });
        console.warn("error from signInWithEmailAndPassword", error);
      });
    }
  }
  updateEntity(path, data) {
    if (!(this.connected && this.currentUser)) {
      console.info("User not logged in and/or client not connected");
      return;
    }
    const url = this.createUrl(path);
    return this._apiRequest(url, "PUT", data);
  }
  async _apiRequest(url, method, payload) {
    console.log(`Sending request to update: ${url} with payload:`, payload);
    let resp;
    try {
      resp = await fetch(url, {
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
    } catch (ex) {
      console.warn("fetch promise rejected:", ex);
    }
    console.log("Handling fetch response with status:", resp.status, resp.statusText, resp);
    let result;
    try {
      result = await resp.json();
    } catch (ex) {
      result = { status: resp.statusText }
    }
    if (resp.ok) {
      this.emit("request/success", result);
    } else {
      switch (resp.status) {
        case 401:
          console.log("Got unauthorized response:", resp.status, resp.statusText, result);
          // unauthorized:
          if (this.currentUser) {
            // token expired maybe?
            console.log("Force logout because of unauthorized response");
            this.onUserLogout();
          }
          break;
        case 403:
          // forbidden: logged in but proposed change refused
          console.log("Got forbidden response:", resp.status, resp.statusText, result);
          break;
        default:
          break;
      }
      this.emit("request/failure", result);
      console.warn("error response:", resp);
    }
  }
};
