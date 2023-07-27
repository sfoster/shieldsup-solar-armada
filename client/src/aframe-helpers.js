export function addAssets(assetsList, sceneElem) {
  console.log("addAssets:", assetsList);
  if (!sceneElem) {
    sceneElem = document.querySelector("a-scene");
  }
  let frag = document.createDocumentFragment();
  console.log("adding scene assets:", assetsList);
  // assets
  for (let assetInfo of assetsList) {
    let elem = document.createElement("a-assets-item");
    for (let [name, value] of Object.entries(assetInfo)) {
      elem.setAttribute(name, value);
    }
    frag.appendChild(elem);
  }
  let assetElem = sceneElem.querySelector("a-assets");
  if (!assetElem) {
    assetElem = document.createElement("a-assets");
    sceneElem.prepend(assetElem);
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
