import { addAssets, addEntities, serializeScene, thawScene } from './aframe-helpers';
window.addAssets = addAssets;
window.addEntities = addEntities;
window.serializeScene = serializeScene;

//      "src": "./assets/stars.png"

let testSceneJSON = `{
  "assets": [
    {
      "id": "sky-img",
      "src": "https://cdn.glitch.me/e99f4064-e398-48d8-882b-d24a844fbb01%2Fpanorama_image.png?v=1634611197961",
    }
  ],
  "entities": [
    {
      "a-type": "entity",
      "camera": "",
      "id": "e-962547431217415",
      "position": "",
      "rotation": "",
      "look-controls": "",
      "wasd-controls": "",
      "a-path": "#e-962547431217415"
    },
    {
      "a-type": "sky",
      "geometry": "",
      "id": "sky",
      "material": "",
      "scale": "",
      "src": "#sky-img",
      "a-path": "#sky"
    },
    {
      "a-type": "box",
      "position": "0 0 -12",
      "rotation": "45 30 0",
      "geometry": "height: 8; width: 8; depth: 8",
      "material": "color: #167341; roughness: 1; metalness: 0.2",
      "id": "e-497215581037086",
      "a-path": "#e-497215581037086"
    },
    {
      "a-type": "entity",
      "light": "",
      "data-aframe-default-light": "",
      "aframe-injected": "",
      "id": "e-1291369304519248",
      "a-path": "#e-1291369304519248"
    },
    {
      "a-type": "entity",
      "light": "",
      "position": "",
      "data-aframe-default-light": "",
      "aframe-injected": "",
      "id": "e-904061361315282",
      "a-path": "#e-904061361315282"
    }
  ]
}`;

window.loadTestScene = function() {
  thawScene(testSceneJSON);
}
