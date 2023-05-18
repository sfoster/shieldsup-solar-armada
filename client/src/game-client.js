import { getAuth, signOut, signInAnonymously, signInWithEmailAndPassword, connectAuthEmulator, onAuthStateChanged } from "firebase/auth";
import { EventEmitterMixin } from './event-emitter';

class User extends EventEmitterMixin(Object) {
  get displayName() {
    return this.remoteUser?.displayName || "(none)";
  }
  get avatarUrl() {
    return "";
  }
  update(properties = {}) {
    for(let [pname, pvalue] of Object.entries(properties)) {
      this[pname] = pvalue;
    }
    this.emit("changed");
  }
}

export class GameClient extends EventEmitterMixin(Object) {
  connected = false;
  urlPrefix = "/api";
  overrideUrl;
  init(firebaseApp) {
    console.log("in _Client.init");
    this.auth = getAuth(firebaseApp);
    this.userModel = new User();
    connectAuthEmulator(this.auth, "http://localhost:9099");
    onAuthStateChanged(this.auth, (firebaseUser) => {
      console.log("onAuthStateChanged:", firebaseUser);
      if (firebaseUser) {
        this.onFirebaseUserAuthenticated(firebaseUser);
      } else {
        this.onFirebaseUserLogout();
      }
    });
  }
  get remoteUser() {
    return this.userModel.remoteUser;
  }
  createUrl(resourcePath) {
    return `${this.overrideUrl ?? this.urlPrefix}/${resourcePath}`;
  }
  async onFirebaseUserAuthenticated(firebaseUser) {
    console.log("onFirebaseUserAuthenticated:", firebaseUser);
    console.assert(this.auth.currentUser == firebaseUser, "user arg is auth's currentUser");
    this.remoteUserIdToken = await firebaseUser.getIdToken();
    this.userModel.remoteUser = firebaseUser;
    this.connected = true;
    this.userModel.update({
      validated: false,
      loggedIn: true,
    });
    this.emit("signedin", { user: this.userModel, idToken: this.remoteUserIdToken });
  }
  onFirebaseUserLogout() {
    this.connected = false;
    delete this.userModel.remoteUser;
    delete this.remoteUserIdToken;
    this.userModel.update({
      validated: false,
      loggedIn: false,
    });
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
    if (!(this.connected && this.remoteUser)) {
      console.info("User not logged in and/or client not connected");
      return;
    }
    const url = this.createUrl(path);
    return this._apiRequest(url, "PUT", data);
  }
  setUser(userModel) {
    if (userModel && userModel !== this.userModel) {
      this.userModel = userModel;
    }
  }
  validateUser() {
    if (!this.userModel) {
      console.warn(`${this.constructor.name}: can't validateUser, no .userModel`);
      return;
    }
    const firebaseUser = this.userModel.remoteUser;
    const url = this.createUrl("usercheck");
    if (firebaseUser && !firebaseUser.isAnonymous) {
      // could also check metadata.lastLoginAt / lastSignInTime
      let validated = false;
      this._apiRequest(url, "POST", {
        email: firebaseUser.email,
        providerId: firebaseUser.providerId,
        uid: firebaseUser.uid
      }).then(result => {
        console.log("validateUser got result:", result);
        validated = (result && result.ok);
      }).catch(() => {
        validated = false;
      }).finally(() => {
        this.userModel.update({
          validated,
        });
        if (validated) {
          this.emit("uservalidated", { user: this.userModel });
        } else {
          this.emit("usernotvalidated", { user: this.userModel });
        }
      });
    }
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
          credential: `token=${this.remoteUserIdToken}`,
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
          if (this.userModel.remoteUser) {
            // token expired maybe?
            console.log("Force logout because of unauthorized response");
            this.onFirebaseUserLogout();
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
    return result;
  }
};
