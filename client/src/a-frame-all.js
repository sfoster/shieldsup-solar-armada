require('aframe');

AFRAME.registerComponent('targetable', {
  init: function () {
    this.clickColors = ['red', 'green', 'blue'];
    console.log("targetable", this.data);
    this.el.classList.add("hitme");
    this.el.addEventListener('click', this);
    this.colorIndex = -1;
  },
  handleEvent(event) {
    console.log("targetable component handling event:", event.type);
    this.colorIndex = (this.colorIndex + 1) % this.clickColors.length;
    this.el.setAttribute('material', 'color', this.clickColors[this.colorIndex]);
    let userEvent = new CustomEvent("scene-targetable-click", { bubbles: true });
    console.log(this.el.id, 'was clicked at: ', event.detail.intersection.point);
    this.el.dispatchEvent(userEvent);
  },
  remove: function () {
    this.el.removeEventListener('click', this);
    this.el.classList.remove("hitme");
  }
});
