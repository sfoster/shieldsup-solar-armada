/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/aframe-helpers.js":
/*!*******************************!*\
  !*** ./src/aframe-helpers.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "addAssets": () => (/* binding */ addAssets),
/* harmony export */   "addEntities": () => (/* binding */ addEntities),
/* harmony export */   "serializeScene": () => (/* binding */ serializeScene),
/* harmony export */   "thawScene": () => (/* binding */ thawScene),
/* harmony export */   "visitAssets": () => (/* binding */ visitAssets),
/* harmony export */   "visitElement": () => (/* binding */ visitElement),
/* harmony export */   "walkScene": () => (/* binding */ walkScene)
/* harmony export */ });
function addAssets(assetsList, sceneElem) {
  console.log("addAssets:", assetsList);
  if (!sceneElem) {
    sceneElem = document.querySelector("a-scene");
  }
  let assetElem = sceneElem.querySelector("a-assets");
  if (!assetElem) {
    assetElem = document.createElement("a-assets");
    sceneElem.prepend(assetElem);
  }
  let frag = document.createDocumentFragment();
  let entityIds = {};
  console.log("adding scene assets:", assetsList);
  // assets
  for (let assetInfo of assetsList) {
    let elem = document.createElement("a-assets-item");
    for (let [name, value] of Object.entries(assetInfo)) {
      if (name == "id") {
        entityIds[value] = elem;
      }
      elem.setAttribute(name, value);
    }
    frag.appendChild(elem);
  }
  for(let [id, newElem] of Object.entries(entityIds)) {
    let existingElem = assetElem.querySelector(`#${id}`);
    if (existingElem) {
      console.log("Removing existing asset element to avoid id clash:", existingElem);
      existingElem.remove();
    }
  }
  assetElem.appendChild(frag);
}

function addEntities(entityList, sceneElem) {
  console.log("addEntities:", entityList);
  if (!sceneElem) {
    sceneElem = document.querySelector("a-scene");
  }
  let fragment = document.createDocumentFragment();
  let excludeAttributeProperties = new Set(["a-type", "a-path", "_depth"])

  for (let entity of entityList) {
    let elem = document.createElement("a-" + entity["a-type"]);
    let parentNode;
    if (entity.parentId) {
      // try the fragment first
      parentNode = fragment.getElementById(entity.parentId);
      if (!parentNode) {
        parentNode = document.getElementById(entity.parentId);
      }
      if (!parentNode) {
        console.warn("Missing parentNode for child", entity["a-path"], entity.parentId);
        continue;
      }
    } else {
      parentNode = fragment;
    }
    for (let [name, value] of Object.entries(entity)) {
      if (excludeAttributeProperties.has(name)) {
        continue;
      }
      elem.setAttribute(name, value);
    }
    parentNode.appendChild(elem);
  }
  if (fragment.childElementCount) {
    sceneElem.appendChild(fragment);
  }
}

function generateId(elem) {
  return "e-"+Math.floor(Math.random() * Date.now() * 1000);
}

function generatePath(elem) {
  let parts = [];
  while (elem && elem.localName != "a-scene") {
    parts.unshift(elem.id ? `#${elem.id}` : elem.localName);
    elem = elem.parentNode;
  }
  return parts.join(" > ");
}

function visitElement(elem, parentElem, sceneData) {
  if (!sceneData.entities) {
    sceneData.entities = [];
  }
  let match = elem.localName.match(/^a-(.+)/);
  if (match) {
    let entity = {
      "a-type": match[1]
    };
    for (let attr of elem.attributes) {
      entity[attr.name] = attr.value;
    }
    if (!entity.id) {
      entity.id = elem.id = generateId(elem);
    }
    entity["a-path"] = generatePath(elem);
    if (parentElem && parentElem.id) {
      entity.parentId = parentElem.id;
    }
    console.log("adding entity: ", entity);
    sceneData.entities.push(entity);
  }
  if (elem.childElementCount) {
    for (let child of elem.children) {
      visitElement(child, elem, sceneData);
    }
  }
}

function visitAssets(elem, sceneData) {
  console.log("visitAssets:", elem.childElementCount);
  if (!sceneData.assets) {
    sceneData.assets = [];
  }
  for (let assetItem of elem.children) {
    sceneData.assets.push({
      id: assetItem.id || generateId(elem),
      src: assetItem.getAttribute("src"),
    });
    console.log("Adding asset:", sceneData.assets[sceneData.assets.length-1]);
  }
}

function walkScene(sceneElem) {
  const sceneData = {
    assets: [],
    entities: [],
  };
  if (sceneElem) {
    sceneElem = document.querySelector("a-scene");
  }
  for (let child of sceneElem.children) {
    console.log("visiting scene child", child);
    if (child.localName == "a-assets") {
      visitAssets(child, sceneData);
    } else {
      visitElement(child, undefined, sceneData);
    }
  }
  return sceneData;
}

function serializeScene(sceneElem) {
  if (!sceneElem) {
    sceneElem = document.querySelector("a-scene");
  }
  let sceneData = walkScene(sceneElem);
  let dataStr = JSON.stringify(sceneData, null, 2);
  return dataStr;
}

function thawScene(sceneData, sceneElem) {
  console.log("at thawScene, assets: ", document.querySelectorAll('a-assets > *'));
  console.log("entities: ", document.querySelectorAll('a-scene :is(a-entity, a-sky)'));
  if (typeof sceneData == "string") {
    sceneData = JSON.parse(sceneData);
  }
  if (!sceneElem) {
    sceneElem = document.querySelector("a-scene");
  }
  let {assets = [], entities = []} = sceneData;
  let sortedEntities = [];
  for (let entity of entities) {
    if (!entity._depth) {
      entity._depth = entity["a-path"].split(" > ").length;
    }
    sortedEntities.push(entity);
  }
  sortedEntities.sort((a, b) => {
    return a._depth > b._depth;
  });

  console.log("Updating scene with data:", assets, sortedEntities);
  addAssets(assets, sceneElem);
  addEntities(sortedEntities, sceneElem);
  console.log("assets: ", document.querySelectorAll('a-assets > *'));
  console.log("entities: ", document.querySelectorAll('a-scene :is(a-entity, a-sky)'));
}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!***************************!*\
  !*** ./src/scene-page.js ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _aframe_helpers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./aframe-helpers */ "./src/aframe-helpers.js");

window.addAssets = _aframe_helpers__WEBPACK_IMPORTED_MODULE_0__.addAssets;
window.addEntities = _aframe_helpers__WEBPACK_IMPORTED_MODULE_0__.addEntities;
window.serializeScene = _aframe_helpers__WEBPACK_IMPORTED_MODULE_0__.serializeScene;

let testSceneJSON = `{
  "assets": [
    {
      "id": "sky",
      "src": "./assets/stars.png"
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
      "id": "thesky",
      "material": "",
      "scale": "",
      "src": "#sky",
      "a-path": "#thesky"
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
  (0,_aframe_helpers__WEBPACK_IMPORTED_MODULE_0__.thawScene)(testSceneJSON);
}

})();

/******/ })()
;
//# sourceMappingURL=scene-page.bundle.js.map