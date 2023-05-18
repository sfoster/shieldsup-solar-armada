import { GameClient } from './game-client';
import { UIScene } from './ui-scene';

export class LobbyScene extends UIScene {
  static sceneName = "lobby-scene";
  enter(params = {}) {
    console.log("LobbyState, got params", params);
    super.enter(params);
    console.log("Entered lobby scene");
    // this.userList = this.querySelector("#playersjoined");
    // this.addUser({ id: "playerone", name: "", placeholder: "Your name goes here" });


    // this.client.enrollUser().then(data => {
    //   for (let user of data.added) {
    //     this.addUser(Object.assign(user, { remote: true }));
    //   }
    // })
  },
  render() {
    return html`
      <games-list id="games-list" data-remoteid="games"></games-list>
      <doc-list id="users-list" data-remoteid="users"></doc-list>
    `;
  }
}
UIScene.scenes.add(LobbyScene);

