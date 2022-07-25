class Component {
  constructor(x, y, width, height, scale) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.scale = scale;

    this.tw = this.width * this.scale;
    this.th = this.height * this.scale;

    this.elements = [];

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.container.x = this.x;
    this.container.y = this.y;

    return this;
  }
  /*createSVGElement() {
    this.elements.forEach((elem) => {
      const rendered = (elem.render) ? elem.render(elem.element) : elem.element.createSVGElement();
      this.rendered.push({
        rendered: rendered,
        element: element,
      });
    });
  }*/
}
class BasicShape {
  constructor(x, y, scale) {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.isComponent = true;

    return this;
  }
  getSVGElement() {
    return this.container;
  }
}
class RoundedTriangle extends BasicShape {
  constructor(x, y, rot, scale) {
    super(x, y, scale);

    this.rot = rot;
    this.container = document.createElementNS("http://www.w3.org/2000/svg", "path");

    this.updateAttributes();

    return this;
  }
  update(parent) {
    this.scale = parent.scale;
  }
  setColor(color) {
    this.color = color;
    this.updateAttributes();
  }
  setStroke(opts) {
    this.stroke = opts.stroke;
    this.strokeWidth = opts.width;
    this.updateAttributes();
  }
  updateAttributes() {
    this.d = "m" + (this.x + (10*this.scale)) + " " + (this.y + (6*this.scale)) + "c1.3 0.7 1.3 2.7 0 3.4l-6.6 3.8c-1.3 0.8-3-0.2-3-1.7v-7.6c0-1.5 1.7-2.5 3-1.7z";
    this.container.setAttribute("d", this.d);
    if (this.color) this.container.setAttribute("fill", this.color);
    if (this.stroke) this.container.setAttribute("stroke", this.stroke);
    if (this.strokeWidth) this.container.setAttribute("stroke-width", this.strokeWidth);
    if (this.rot || this.scale) this.container.setAttribute("transform", (this.scale) ? "scale(" + this.scale + ")" : " " + (this.rot) ? path.setAttribute("transform", "rotate(" + this.rot + "," + (this.x + 10*this.scale)/2 + "," + (this.y + 6*this.scale)/2 + ")") : "");
  }
  setScale(scale) {
    this.scale = scale;
    this.updateAttributes();
  }
}
class Circle {
  constructor(x, y, radius, cornerCoords) {
    this.x = (cornerCoords) ? x + radius : x;
    this.y = (cornerCoords) ? y + radius : y;
    this.r = radius;
    this.isComponent = true;

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    return this;
  }
  setColor(color) {
    this.color = color;
  }
  setStroke(opts) {
    this.stroke = opts.stroke;
    this.strokeWidth = opts.width;
  }
  update(parent) {
    this.scale = parent.scale;
    this.updateAttributes();
  }
  updateAttributes() {
    const circle = this.container;
    circle.setAttribute("cx", this.x);
    circle.setAttribute("cy", this.y);
    circle.setAttribute("r", this.r);
    if (this.stroke) circle.setAttribute("stroke", this.stroke);
    if (this.strokeWidth) circle.setAttribute("stroke-width", this.strokeWidth);
    if (this.color) circle.setAttribute("fill", this.color);
  }
  createSVGElement() {
    const circle = this.container;
    this.updateAttributes();
    return circle;
  }
  setScale(scale) {
    this.scale = scale;
    this.x = this.x * this.scale;
    this.y = this.y * this.scale;
    this.r = this.r * this.scale;
    this.updateAttributes();
  }
}
class Rectangle {
  constructor(x, y, width, height, rounded=false, radius=0) {
    this.x = x;
    this.y = y;
    this.height = height;
    this.width = width;
    this.rounded = rounded;
    this.isComponent = true;

    this.radius = radius;
    this.rx = (radius !== 0) ? radius : 0.3;
    this.ry = (radius !== 0) ? radius : 0.3;

    this.shadow = null;

    this.eventElem = document.createElement("span");
    this.clickEvent = new Event("click");

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    return this;
  }
  setColor(color) {
    this.color = color;
  }
  setStroke(opts) {
    this.stroke = opts.color;
    this.strokeWidth = opts.width;
  }
  setShadow(shadow) {
    this.shadow = shadow;
  }
  setClipPath(path) {
    this.clipPath = path;
  }
  addEventListener(event, cb) {
    return this.eventElem.addEventListener(event, cb);
  }
  createClipPath(yOffset) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    let id = "rounded" + (new Date()).getTime();
    path.id = id;
    defs.appendChild(path);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", 0);
    rect.setAttribute("y", yOffset);
    rect.setAttribute("width", this.width);
    rect.setAttribute("height", this.height + this.radius);
    rect.setAttribute("rx", this.radius);
    rect.setAttribute("ry", this.radius);
    path.appendChild(rect);

    return { element: defs, id: id };
  }
  updateAttributes() {
    const rect = this.container;
    rect.setAttribute("x", this.x);
    rect.setAttribute("y", this.y);
    rect.setAttribute("width", this.width);
    rect.setAttribute("height", this.height);
    if (this.color) rect.setAttribute("fill", this.color);
    if (this.stroke) rect.setAttribute("stroke", this.stroke);
    if (this.strokeWidth) rect.setAttribute("stroke-width", this.strokeWidth);
    if (this.shadow) rect.setAttribute("filter", "url(#" + this.shadow + ")");
    if (!this.rounded) return rect;
    if (this.clipPath) {
      rect.setAttribute("clip-path", "url(#" + this.clipPath + ")");
      return rect;
    }
    rect.setAttribute("rx", this.rx);
    rect.setAttribute("ry", this.ry);
  }
  createSVGElement() {
    const rect = this.container;
    this.updateAttributes();
    rect.onclick = () => {
      this.eventElem.dispatchEvent(this.clickEvent);
    }
    return rect;
  }
  setScale(scale) {
    this.scale = scale;
    this.height = this.height * scale;
    this.width = this.width * scale;
    this.radius = this.radius = scale;
    this.rx = (this.radius !== 0) ? this.radius : 0.3;
    this.ry = (this.radius !== 0) ? this.radius : 0.3;
    this.updateAttributes();
  }
}
class RasterBackground {
  constructor(x, y, width, height, zoom) {
    this.colors = {
      background: "#141414",
      dot: "#1c1c1c"
    }

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.zoom = zoom;

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "g");

    this.bg = new Rectangle(0, 0, this.width, this.height);
    this.bg.setColor(this.colors.background);

    this.baseDist = this.width / 23;
    this.dotRad = 5;

    return this;
  }
  createDots() {
    this.distance = this.baseDist * this.zoom;
    this.rad = this.dotRad * this.zoom;

    this.dots = [];
    this.columns = Math.floor(this.width / this.distance);
    this.rows = Math.floor(this.height / this.distance);

    for (let i = 0; i < this.columns; i++) {
      for (let j = 0; j < this.rows; j++) {
        const circle = new Circle(this.distance * (i + 1), this.distance * (j + 1), this.rad, false);
        circle.setColor(this.colors.dot);
        this.dots.push(circle);
      }
    }
  }
  createSVGElement() {
    this.container.innerHTML = "";
    this.createDots();
    this.container.append(this.bg.createSVGElement());
    this.container.append(...this.dots.map(el => el.createSVGElement()));
    return this.container;
  }
  setScale() {

  }
}
class SVGEngine {
  constructor() {
    this.element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.element.setAttribute("height", window.innerHeight);
    this.element.setAttribute("width", window.innerWidth);
    document.body.appendChild(this.element);

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.components = [];
    this.scale = 1;

    return this;
  }
  static createShadowFilter(dx=3, dy=3, x=0, y=0, deviation=2) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    let id = "shadow" + (new Date()).getTime();
    filter.id = id;
    filter.setAttribute("x", x);
    filter.setAttribute("y", y);
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");
    defs.appendChild(filter);

    const offset = document.createElementNS("http://www.w3.org/2000/svg", "feOffset");
    offset.setAttribute("dx", dx);
    offset.setAttribute("dy", dy);
    offset.setAttribute("in", "SourceAlpha");
    offset.setAttribute("result", "offset");
    filter.appendChild(offset);

    const blur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    blur.setAttribute("in", "offset");
    blur.setAttribute("stdDeviation", deviation);
    blur.setAttribute("result", "blur");
    filter.appendChild(blur);

    const blend = document.createElementNS("http://www.w3.org/2000/svg", "feBlend");
    blend.setAttribute("in", "SourceGraphic");
    blend.setAttribute("in2", "blur");
    blend.setAttribute("mode", "normal");
    filter.appendChild(blend);

    return { element: defs, id: id };
  }
  zoomOut() {
    this.components.forEach((c, i) => {
      c.component.setScale(0.5);
    });
  }
  zoomIn() {
    this.components.forEach((c, i) => {
      c.component.setScale(1.5);
    });
  }
  addComponent(c, render=(el)=>el.createSVGElement()) {
    this.components.push({ component: c, render: render});
    this.element.appendChild(render(c));
  }
  createPath() {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M10 10 L100 100");
    path.setAttribute("stroke", "black");
    this.element.appendChild(path);
  }
}

document.body.style.height = window.innerHeight + "px";
document.body.style.width = window.innerWidth + "px";

const engine = new SVGEngine();

const bgrd = new RasterBackground(0, 0, engine.width, engine.height, 1);
engine.addComponent(bgrd);

const t = new RoundedTriangle(200, 200, 0, 1);
t.setColor("white");
t.setStroke({
  stroke: "white",
  width: "1"
});
engine.element.appendChild(t.getSVGElement());
