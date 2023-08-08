export function addAssets(assetsList, sceneElem) {
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

export function addEntities(entityList, sceneElem) {
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

export function visitElement(elem, parentElem, sceneData) {
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

export function visitAssets(elem, sceneData) {
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

export function walkScene(sceneElem) {
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

export function serializeScene(sceneElem) {
  if (!sceneElem) {
    sceneElem = document.querySelector("a-scene");
  }
  let sceneData = walkScene(sceneElem);
  let dataStr = JSON.stringify(sceneData, null, 2);
  return dataStr;
}

export function thawScene(sceneData, sceneElem) {
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