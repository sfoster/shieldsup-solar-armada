import { getAuth, signOut, signInAnonymously, signInWithEmailAndPassword, connectAuthEmulator, onAuthStateChanged } from "firebase/auth";
import { EventEmitterMixin } from './event-emitter';
import { RemoteObject } from "./collections";

// All the different kinds of users:
// * The firebase auth user. Gives us uid, and user name but probably not the player/display name
// * The player we're tracking in the db.
//   - This is 1:1 with the auth'd user, but has the displayName, avatar, current game etc

class User extends EventEmitterMixin(Object) {
  get displayName() {
    return this.remoteUser?.displayName || "(none)";
  }
  get avatarUrl() {
    return "";
  }
  get isAnonymous() {
    return this.remoteUser?.isAnonymous;
  }
  setRemoteUser(remoteUser, authIdToken) {
    this.remoteUser = remoteUser;
    this.authIdToken = authIdToken;
    this.update({
      loggedIn: true,
    });
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
  remoteUser = null;
  firebaseUserAuthIdToken = null;
  _userValidated = false;
  documents = new Map();
  collections = new Map();

  init(firebaseApp) {
    console.log("in _Client.init");
    this.auth = getAuth(firebaseApp);
    connectAuthEmulator(this.auth, "http://localhost:9099");
    this.initializingPromise = new Promise((resolve, reject) => {
      onAuthStateChanged(this.auth, async (firebaseUser) => {
        try {
          console.log("onAuthStateChanged:", firebaseUser);
          if (firebaseUser) {
            await this.onFirebaseUserAuthenticated(firebaseUser);
          } else {
            this.onFirebaseUserLogout();
          }
          resolve(true);
        } catch (ex) {
          reject(ex);
        }
      });
      this.documents.set("_player_", new RemoteObject());
    })
  }
  createUrl(resourcePath) {
    return `${this.overrideUrl ?? this.urlPrefix}/${resourcePath}`;
  }
  get playerDocument() {
    return this.documents.get("_player_");
  }
  get userValidated() {
    return this._userValidated;
  }
  get userLoggedIn() {
    return !!this.auth?.currentUser;
  }
  get userInQueue() {
    if (this.playerDocument.getProperty("gameId")) {
      return false;
    }
    const lastSeen = this.playerDocument.getProperty("lastSeen");
    const maxIntervalMs = 1000 * 60 * 5; // 5mins
    return lastSeen ? Date.now() - lastSeen <= maxIntervalMs : false;
  }
  get userInGame() {
    const gameId = this.playerDocument.getProperty("gameId");
    return !!gameId;
  }
  async onFirebaseUserAuthenticated(firebaseUser) {
    console.log("onFirebaseUserAuthenticated:", firebaseUser);
    console.assert(this.auth.currentUser == firebaseUser, "user arg is auth's currentUser");
    this.firebaseUserAuthIdToken = await firebaseUser.getIdToken();
    // document.cookie = "token=" + token;
    this.connected = true;
    this.emit("signedin", { todo: "Some properties needed here?" });
  }
  onFirebaseUserLogout() {
    this.connected = false;
    delete this.firebaseUserAuthIdToken;
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
  _assertNonAnonymousUser(message) {
    let error;
    if (
      !this.auth.currentUser ||
      this.auth.currentUser.isAnonymous
    ) {
      throw new Error(message);
    }
  }
  validateUser() {
    try {
      this._assertNonAnonymousUser("non-anonymous logged in user required");
    } catch (ex) {
      return;
    }
    const firebaseUser = this.auth.currentUser;
    const url = this.createUrl("usercheck");
    if (!firebaseUser.isAnonymous) {
      // could also check metadata.lastLoginAt / lastSignInTime
      this._apiRequest(url, "POST", {
        email: firebaseUser.email,
        providerId: firebaseUser.providerId,
        uid: firebaseUser.uid
      }).then(result => {
        console.log("validateUser got result:", result);
        this._userValidated = (result && result.ok);
      }).catch(() => {
        this._userValidated = false;
      }).finally(() => {
        if (this._userValidated) {
          this.emit("uservalidated", {});
        } else {
          this.emit("usernotvalidated", {});
        }
      });
    }
  }

  async enqueueUser() {
    this._assertNonAnonymousUser("non-anonymous logged in user required");
    let displayName = this.playerDocument.getProperty("displayName") ?? "No-name";
    const url = this.createUrl("joinserver");
    await this._apiRequest(url, "POST", {
      displayName,
      uid: this.auth.currentUser.uid,
    });
  }

  async joinGame(gameId) {
    console.log("client.joinGame, gameId:", gameId);
    this._assertNonAnonymousUser("non-anonymous logged in user required");
    let displayName = this.playerDocument.getProperty("displayName") ?? "No-name";

    const url = this.createUrl(`joingame/${gameId}`);
    await this._apiRequest(url, "POST", {
      displayName,
      uid: this.auth.currentUser.uid,
    });
  }

  async leaveGame() {
    console.log("client.leaveGame, gameId:", this.playerDocument.getProperty("gameId"));
    this._assertNonAnonymousUser("non-anonymous logged in user required");

    const url = this.createUrl("leavegame");
    try {
      await this._apiRequest(url, "POST", {});
    } catch (ex) {
      console.log("request to leaveGame failed:", ex);
    } finally {
      this.emit("usernogameid", {});
    }
  }

  async ping() {
    const url = this.createUrl("hello");
    return this._apiRequest(url, "GET");
  }

  async importScene(sceneId, data) {
    this._assertNonAnonymousUser("non-anonymous logged in user required");
    console.log("Will import:", sceneId, data);

    const url = this.createUrl(`import/${sceneId}`);
    await this._apiRequest(url, "POST", data);
  }

  async _apiRequest(url, method, payload) {
    let resp;
    let requestError;
    let body;
    if (method == "GET") {
      // pass the token in the querystring
      let _url = new URL(url, window.location.href);
      let qsparams = new URLSearchParams(_url.search.slice(1));
      qsparams.set("token", this.firebaseUserAuthIdToken);
      _url.search = `?${qsparams}`;
      console.log("GET request, created url with querystring:", _url);
      url = _url.toString();
    } else {
      // pass the token in the request body
      body = JSON.stringify({
        data: payload,
        credential: `token=${this.firebaseUserAuthIdToken}`,
      });
    }
    console.log(`Sending request to update: ${url} with request body:`, body);
    try {
      resp = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });
    } catch (ex) {
      console.warn("fetch promise rejected:", ex);
      requestError = ex;
    }
    console.log("Handling fetch response with status:", resp.status, resp.statusText, resp);
    if (!resp) {
      this.emit("request/failure", requestError);
      return;
    }
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
          if (this.auth.currentUser) {
            // token expired maybe?
            console.log("Force logout because of unauthorized response");
            signOut(this.auth);
            // this.onFirebaseUserLogout();
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
