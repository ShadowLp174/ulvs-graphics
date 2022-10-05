class Component {
  constructor(x, y, width, height, scale) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.scaleCoords = this.scaleCoords;
    this.isComponent = true;
    this.ox = this.x; // store original x and y
    this.oy = this.y;
    this.renderContainer = null;

    this.elements = []; // the array containing every sub-element of this component:
    /*
    structure:
    [
      {
        element: a variable containing the element, can be anything
        render: a function that gets called to create the html element. Must return a valid HTML Node; parameter: the element that will be rendered
      }
    ]
    */

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg"); // the container
    this.container.style.overflow = "overlay";
    this.updateAttributes();

    return this;
  }
  updateAttributes() { // variable attributes
    this.tw = this.width * this.scale; // true width: the width when the proper scale is applied
    this.th = this.height * this.scale; // same as tw but with height

    /*if (this.scaleCoords) { // do the same for coords like for height if scalable
      this.x = this.ox * this.scale;
      this.y = this.oy * this.scale;
    } else {
      this.x = this.ox;
      this.y = this.oy;
    }*/

    this.container.setAttribute("x", this.x);
    this.container.setAttribute("y", this.y);
  }
  updateChildren() {
    this.elements.forEach((elem) => {
      (!elem.update) ? elem.element.update(this) : elem.update(elem.element, this);
    });
  }

  moveToTop() { // moves the current component to the top of the container
    if (!this.renderContainer) return false;
    if (this.renderContainer.querySelector("#connectors")) {
      // component is inside a svgengine
      const connectorGroup = this.renderContainer.querySelector("#connectors");
      this.renderContainer.insertBefore(this.container, connectorGroup);
      return true;
    } else {
      this.renderContainer.appendChild(this.container);
      return true;
    }
  }

  setPosition(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.updateAttributes();
    return pos;
  }
  createSVGElement(c) { // create the whole svg element and return it
    this.renderContainer = c;
    this.container.innerHTML = "";
    this.elements.forEach((elem) => { // loop through each sub-element
      const rendered = (!elem.render) ? elem.element.createSVGElement(elem.element) : elem.render(elem.element); // and call the render function
      if (Array.isArray(rendered)) {
        this.container.append(...rendered);
      } else {
        this.container.append(rendered);
      }
    });
    return this.container;
  }
  attachEngine(e) {
    this.parentSVGEngine = e;
  }
}
class Viewport {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.components = [];

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.container.style.overflow = "overlay";
    this.updateAttributes();

    return this;
  }
  setPosition(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.updateAttributes();
  }
  setScale(s) {
    this.scale = s;
    this.components.forEach(c => {
      c.setScale(s);
    });
  }
  addComponent(c, render=(el)=>el.createSVGElement()) {
    this.components.push({ element: c, render: render });
  }
  updateAttributes() {
    this.container.setAttribute("x", this.x);
    this.container.setAttribute("y", this.y);
  }
  createSVGElement() {
    this.container.innerHTML = "";
    this.components.forEach((elem) => { // loop through each sub-element
      const rendered = (!elem.render) ? elem.element.createSVGElement(elem.element) : elem.render(elem.element); // and call the render function
      if (Array.isArray(rendered)) {
        this.container.append(...rendered);
      } else {
        this.container.append(rendered);
      }
    });
    return this.container;
  }
}
class Group { // somehow the equivalent to the <g> element
  constructor() {
    this.components = [];

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "g");

    return this;
  }
  setPosition(pos) {
    this.components.forEach((c) => {
      c.setPosition(pos);
    });
  }
  setScale(s) {
    this.components.forEach((c) => {
      c.setScale(s);
    });
  }
  addComponent(c, render=(el)=>el.createSVGElement()) {
    this.components.push(c);
    this.container.appendChild(render(c));
  }
  createSVGElement() {
    return this.container;
  }
}
class UserInteractionManager {
  constructor() {
    this.listeners = [];

    return this;
  }
  initListeners(el, onStart, onMove, onEnd, maxTouches=Number.POSITIVE_INFINITY, reuseTouches=false) { // TODO: fix bugs appearing when using more than one finger
    // mouse listeners
    el.addEventListener("mousedown", onStart);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseup", onEnd);

    // touch implementation
    function prevent(e) {
      if (e.cancelable) {
        e.preventDefault();
        return true;
      }
      return false;
    }
    const currTouches = [];
    el.addEventListener("touchstart", (e) => {
      prevent(e);
      if (!window.OpenVSTouches) window.OpenVSTouches = [];
      const touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        if (currTouches.length >= maxTouches) continue;
        if (!reuseTouches && maxTouches != Number.POSITIVE_INFINITY) {
          if (window.OpenVSTouches.findIndex(el => el.identifier == touches[i].identifier) != -1) return;
          currTouches.push(touches[i]);
          onStart(touches[i]);
          window.OpenVSTouches.push(touches[i]);
          return;
        }
        currTouches.push(touches[i]);
        window.OpenVSTouches.push(touches[i]);
        onStart(touches[i]);
      }
    });
    el.addEventListener("touchcanel", (e) => {
      prevent(e);
      const touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const pos = currTouches.findIndex(el => el.identifier == touch.identifier);
        if (pos >= 0) currTouches.splice(pos, 1);
        if (pos >= 0) onEnd(e);
        const p = window.OpenVSTouches.findIndex(el => el.identifier == touch.identifier);
        if (p >= 0) window.OpenVSTouches.splice(p, 1);
      }
    });
    el.addEventListener("touchend", (e) => {
      prevent(e);
      const touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const pos = currTouches.findIndex(el => el.identifier == touch.identifier);
        if (pos >= 0) currTouches.splice(pos, 1);
        if (pos >= 0) onEnd(e);
        const p = window.OpenVSTouches.findIndex(el => el.identifier == touch.identifier);
        if (p >= 0) window.OpenVSTouches.splice(p, 1);
      }
    });
    el.addEventListener("touchmove", (e) => {
      prevent(e);
      const touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const pos = currTouches.findIndex(el => el.identifier == touch.identifier);
        const event = {};
        for (var key in touch) {
          event[key] = touch[key];
        }
        const movementX = touch.clientX - currTouches[pos].clientX;
        const movementY = touch.clientY - currTouches[pos].clientY;
        event.movementX = movementX;
        event.movementY = movementY;
        if (pos >= 0) {
          currTouches.splice(pos, 1, touch);
        } else {
          currTouches.push(touch);
        }
        if (pos >= 0) onMove(event);
      }
    });
  }
}
class OutputPlugComponent extends Component {
  static Type = {
    BOOLEAN: "bool",
    NUMBER: "num",
    INTEGER: "int",
    CONNECTOR: "connect",
    ANY: "any"
  }
  static ColorMapping = {
    bool: "#a44747",
    connect: "#ffffff",
    num: "#427fbd",
    int: "#427fbd"
  }
  static TypeLabel = {
    bool: "BOOL",
    num: "NUM",
    int: "INT"
  }
  static ConnectorColor = {
    bool: "#a44747",
    connect: "#808080",
    num: "#427fbd",
    int: "#427fbd"
  }
  constructor(x, y, width, height, scale, type, engine, node, styleType="", label="") {
    super(x, y, width, height, scale);

    this.styleType = styleType; // the style of the connector like Bezier, or Line
    this.type = type; // the type of the plug
    this.node = node; // the node the plug is attached to
    this.connected = false;
    this.interactions = new UserInteractionManager(); // user interactions
    this.label = label;

    this.minConDist = 50; // the minimum distance to snap

    this.container.setAttribute("OpenVS-Node-Id", this.node.id);

    this.plugPos = { // center position of the circle
      x: 20 * this.scale + 8 * this.scale,
      y: 8 * this.scale
    }
    this.parentSVGEngine = engine;
    this.connected = [];

    this.color = OutputPlugComponent.ColorMapping[type];

    this.oCircle = new Circle(20 * this.scale, 0, 8 * this.scale, true); // the white circle
    this.oCircle.setColor(this.color);
    this.initConnector();
    this.elements.push({ element: this.oCircle, render: (el) => el.createSVGElement() });

    this.eventElem = document.createElement("span");

    if (type !== OutputPlugComponent.Type.CONNECTOR) {
      this.initType();
      return this;
    }

    this.oT = new RoundedTriangleComponent(0, 2.5*this.scale, 90, 1 * this.scale); // the white triangle
    this.oT.setColor("white");
    this.elements.push({ element: this.oT, render: (el) => el.createSVGElement() });

    return this;
  }
  addEventListener(event, cb) {
    return this.eventElem.addEventListener(event, (e) => {
      cb(e.detail);
    });
  }
  emit(event, data) {
    return this.eventElem.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  initType() {
    this.oCircle.setPosition({
      x: 20 * this.scale,
      y: 0
    });

    let metrics = Text.measureText(this.label);
    this.text = new Text(13 * this.scale, (2.5) * this.scale, this.label, this.scale, Text.Anchor.END, Text.VerticalAnchor.TOP);
    this.text.setColor("white");
    this.elements.push({ element: this.text });

    //let typeMetrics = Text.measureText(OutputPlugComponent.TypeLabel[this.type]);
    this.typeLabel = new Text((13 - metrics.width) * this.scale, (2) * this.scale, OutputPlugComponent.TypeLabel[this.type], this.scale, Text.Anchor.END, Text.VerticalAnchor.TOP);
    this.typeLabel.container.style.fontSize = (9 * this.scale) + "px";
    this.typeLabel.setColor(this.color);
    this.elements.push({ element: this.typeLabel });
  }
  setOpacity(o) {
    this.opacity = o;
    this.container.style.opacity = o;
  }
  attachEngine(e) {
    this.parentSVGEngine = e;
  }
  getAbsCoords(elem) {
    const box = elem.getBoundingClientRect();

    const body = document.body;
    const docEl = document.documentElement;

    const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    const clientTop = docEl.clientTop || body.clientTop || 0;
    const clientLeft = docEl.clientLeft || body.clientLeft || 0;

    const top = box.top + scrollTop - clientTop;
    const left = box.left + scrollLeft - clientLeft;

    return { x: left, y: top };
  }
  distance(x, y, x1, y1) { // get the distance between two points x,y and x1,y1
    return Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
  }
  setConnectorType(type) {
    this.styleType = type;
  }
  initSnapping() {
    this.sockets = this.getSockets();
    this.connectables = [];
    this.sockets.forEach(socket => {
      const s = socket.cCircle; // connection element
      const abs = this.getAbsCoords(s.container);
      const coords = {
        x: abs.x - this.parentSVGEngine.left,
        y: abs.y - this.parentSVGEngine.top
      };
      this.connectables.push({
        socket: socket,
        coords: coords,
        distance: null
      });
    });
  }
  getSockets() {
    const sockets = [];
    const check = (component) => {
      if (!Array.isArray(component)) return;
      component.forEach(c => {
        if (!(c instanceof InputSocketComponent)) return;
        // InputSocket selection ruleset
        if (c.node == this.node) return; // don't allow self-connections
        if (c.type != InputSocketComponent.Type.CONNECTOR) {
          if (c.connected) return;
        }
        if (this.connected.findIndex(el => el.connectedTo.id == c.id) >= 0) return; // disable duplicate connections
        if (!Connector.typesCompatible(c.type, this.type)) return; // only connect to sockets of the same type

        sockets.push(c);
        return;
      });
    }
    const gs = (component) => { // check children of components recursively for sockets
      check(component);
      if (!component.elements) return;
      component.elements.forEach((el) => {
        if (el.element instanceof Viewport) {
          el.element.components.forEach(e => {
            gs(e.element);
          });
          return;
        }
        gs(el.element);
      });
    }
    this.parentSVGEngine.components.forEach((c) => {
      gs(c.component);
    });
    return sockets;
  }
  setColor(c) {
    this.color = c;
    this.oCircle.setColor(c);
    this.oT.setStroke(c)
    this.oT.setColor("transparent");
  }
  prepareSnap(connectable) {
    this.snapping = true;
    const socket = connectable.socket;
    socket.cCircle.setRadius(10 * socket.scale); // change circle props without changing position
    this.snappingSocket = connectable;
  }
  snap() {
    const socket = this.snappingSocket.socket;
    this.activeConnector.moveTo({
      x: this.snappingSocket.coords.x + 8 * socket.scale,
      y: this.snappingSocket.coords.y + 8 * socket.scale
    });
    this.activeConnector.connectedTo = this.snappingSocket.socket;
    this.activeConnector.connectedNode = this.snappingSocket.socket.node.id;
    socket.connected = true;
    socket.connector = this.activeConnector;
    socket.node.addEventListener("move", (e) => {
      if (this.connected.length == 0 || !this.connected) return; // only execute if the node is currently connected
      const pos = this.getAbsCoords(socket.cCircle.container);
      pos.x += socket.cCircle.radius * socket.scale;
      pos.y += socket.cCircle.radius * socket.scale;
      this.connected.forEach((socket) => {
        if (socket.connectedNode != e.detail.node.id) return;
        socket.moveTo(pos);
      });
    });
    socket.connect();
    this.connected.push(this.activeConnector);
    socket.cCircle.setRadius(8 * socket.scale); // reset socket proportions
    this.dragging = false;
  }
  initConnector() {
    this.dragging = false;
    this.snapping = false;
    this.mouseDown = (e) => {
      this.dragging = true;
      this.initSnapping();
      this.activeConnector = new (ConnectorManager.getConnector(this.styleType))(this, { x: e.clientX, y: e.clientY }, this.getAbsCoords(this.oCircle.container), this.scale, OutputPlugComponent.ConnectorColor[this.type]);
      this.parentSVGEngine.element.appendChild(this.activeConnector.createSVGElement()); // don't add as a component to prevent "wobbing" while panning
      this.emit("connector", this.activeConnector);
    }
    this.interactions.initListeners(this.oCircle.container, (e) => {
      this.mouseDown(e);
    }, () => {}, () => {});
    this.node.addEventListener("move", () => {
      if (!this.activeConnector || !this.connected) return; // only execute if there is a connected connector
      const pos = this.getAbsCoords(this.oCircle.container);
      pos.x += this.oCircle.radius * this.scale;
      pos.y += this.oCircle.radius * this.scale;
      this.connected.forEach(c => {
        c.moveStartTo(pos);
      });
    });
    this.interactions.initListeners(window, () => {}, (e) => {
      // move listener
      if (!this.dragging) return;
      this.activeConnector.moveTo({ x: e.clientX, y: e.clientY });
      this.connectables.forEach((c, i) => {
        const distance = this.distance(c.coords.x, c.coords.y, e.clientX, e.clientY);
        this.connectables[i].distance = distance;
      });
      this.connectables.sort((a, b) => {
        if (a.distance < b.distance) return -1;
        if (a.distance > b.distance) return 1;
        return 0;
      });
      var reset = () => {
        const s = this.snappingSocket.socket;
        s.cCircle.setRadius(8 * s.scale);
        this.snapping = false;
      }
      if (this.connectables.length == 0) return;
      if (this.connectables[0].distance > (this.minConDist || 50)) {
        if (!this.snappingSocket) return;
        reset()
        return;
      }
      if (this.connectables != this.snappingSocket && this.snappingSocket) {
        reset();
      }
      this.prepareSnap(this.connectables[0]);
    }, () => {
      // end/cancel listener
      if (!this.dragging) return;
      if (this.snapping) return this.snap();
      this.emit("connectordestroy", this.activeConnector);
      this.activeConnector = this.activeConnector.destroy(); // destroy the connector and the variable; cause destroy returns undefined
      this.dragging = false;
    });
  }
  findEngine() { // find the html element of the engine recursively
    var checkParent = (elem) => { // unused
      const parent = elem.parentElement;
      return (parent.id.includes("ULVS-Engine_")) ? parent : checkParent(parent);
    }
    return checkParent(this.container);
  }
  setSubComponentAttributes() { // update sub-elements
    this.oCircle.setPosition({
      x: 20 * this.scale,
      y: 0
    });
    this.plugPos = {
      x: 20 * this.scale + 8 * this.scale,
      y: 8 * this.scale
    }
    this.oT.setPosition({
      x: 0,
      y: -1 * this.scale
    });
    this.oCircle.radius = 8 * this.scale;
    this.oT.setScale(1 * this.scale);
  }
  setScale(s) {
    this.scale = s;
    super.updateAttributes();
    this.setSubComponentAttributes();
  }
}
class InputSocketComponent extends Component {
  static Type = {
    BOOLEAN: "bool",
    CONNECTOR: "connect",
    NUMBER: "num",
    INTEGER: "int",
    FLOAT: "float",
    ANY: "any"
  }
  static ColorMapping = {
    bool: "#a44747",
    connect: "#ffffff",
    num: "#427fbd",
    int: "#427fbd"
  }
  static TypeLabel = {
    bool: "BOOL",
    num: "NUM",
    int: "INT"
  }
  constructor(x, y, width, height, scale, type, node, label, checkbox=true) {
    super(x, y, width, height, scale);

    this.type = type; // TODO: the type of the socket
    this.node = node; // the node the socket is attached to
    this.label = label;
    this.id = uid();
    this.checkbox = (type === InputSocketComponent.Type.BOOLEAN) ? checkbox : false; // TODO: add an input for nums/strings

    this.container.setAttribute("OpenVS-Node-Id", this.node.id);

    this.color = InputSocketComponent.ColorMapping[type];

    this.cCircle = new Circle(0, 0, 8 * this.scale, true);
    this.cCircle.setColor(this.color);
    this.elements.push({ element: this.cCircle, render: (el) => el.createSVGElement() });

    this.con; // the connector

    if (type !== InputSocketComponent.Type.CONNECTOR) {
      this.initType();
      return this;
    }

    // only draw this when creating a connection connector
    this.cT = new RoundedTriangleComponent(22*this.scale, 2.5 * this.scale, 90, 1 * this.scale);
    this.cT.setColor(this.color);
    this.elements.push({ element: this.cT, render: (el) => el.createSVGElement() });

    return this;
  }
  get connector() {
    return this.con;
  }
  set connector(connector) {
    return this.con = connector;
  }
  connect() {
    if (!this.checkbox) return;
    if (!this.box) return;
    this.box.container.style.display = "none";
    this.offset = 0;
    this.relocateLabels();
  }
  disconnect() {
    if (!this.checkbox) return;
    if (!this.box) return;
    this.box.container.style.display = "block";
    this.offset = 23;
    this.relocateLabels();
  }
  relocateLabels() {
    let metrics = this.metrics;
    let typeMetrics = this.typeMetrics;
    this.text.setPosition({
      x: (21 + this.offset) * this.scale,
      y: (metrics.height + 3) * this.scale
    });
    this.typeLabel.setPosition({
      x: (this.offset - 21 + metrics.width + typeMetrics.width)*this.scale,
      y: (typeMetrics.height + 2) * this.scale
    });
  }
  initType() {
    this.offset = (this.checkbox) ? 23 : 0;
    if (this.checkbox) {
      this.box = new SVGCheckbox(21 * this.scale, 0, this.scale, false, (state) => {
        if (this.node.simulate) this.node.simulate(state); // change the opacity of the plugs
      });
      this.elements.push({ element: this.box });
    }

    let metrics = Text.measureText(this.label);
    this.metrics = metrics;
    this.text = new Text((21 + this.offset) * this.scale, (3) * this.scale, this.label, this.scale, Text.Anchor.START, Text.VerticalAnchor.TOP);
    this.text.setColor("white");
    this.elements.push({ element: this.text, render: (el) => el.createSVGElement() });

    let typeMetrics = Text.measureText(InputSocketComponent.TypeLabel[this.type], (9 * this.scale) + "px");
    this.typeMetrics = typeMetrics;
    this.typeLabel = new Text((this.offset + 21 + metrics.width)*this.scale, (2) * this.scale, InputSocketComponent.TypeLabel[this.type], this.scale, Text.Anchor.START, Text.VerticalAnchor.TOP);
    this.typeLabel.container.style.fontSize = (9 * this.scale) + "px";
    this.typeLabel.setColor(this.color);
    this.elements.push({ element: this.typeLabel, render: (el) => el.createSVGElement() });
  }
  setSubComponentAttributes() { // update sub-elements
    this.cCircle.radius = 8 * this.scale;

    if (this.text) this.text.setScale(this.scale);

    if (this.type !== InputSocketComponent.Type.CONNECTOR) return;
    this.cT.setScale(1 * this.scale);
    this.cT.setPosition({
      x: 22 * this.scale,
      y: -1 * this.scale
    });
  }
  setScale(s) {
    this.scale = s;
    super.updateAttributes();
    this.setSubComponentAttributes();
  }
}
class Node extends Component {
  static ClassColor = {
    basic: "#8a5794",
    event: "#779457",
    deviceinfo: "#946148"
  };
  static Class = {
    BASIC: "basic",
    EVENT: "event",
    DEVICEINFO: "deviceinfo"
  }
  static ClassName = {
    basic: "Basic",
    event: "Event",
    deviceinfo: "Device Info"
  }
  constructor(x, y, scale, svgEngine) {
    let height = 37.5 * scale;
    let width = 200 * scale;
    super(x, y, width, height, scale);

    this.colors = {
      background: "#1d1d1d",
      header: "#8a5794"
    }

    this.id = uid();
    this.parentSVGEngine = svgEngine;
    this.embedNode = false;

    window.openVS.nodes[this.id] = this;
    this.container.setAttribute("OpenVS-Node-Id", this.id);

    this.shadows = SVGEngine.createShadowFilter(0, 1); // create the shadow defs element
    this.shadowElement = this.shadows.element;
    this.elements.push({ element: this.shadows.element, render: (el) => el });

    this.bgRect = new Rectangle(0, 1, this.tw, this.th, true, 4);
    this.bgRect.setColor(this.colors.background);
    this.bgRect.setStroke({
      color: "black",
      width: 0.5
    });
    this.bgRect.setShadow(this.shadows.id);
    this.elements.push({ element: this.bgRect, render: (el) => el.createSVGElement() });

    this.hRect = new Rectangle(0, 0, this.tw, 33 * this.scale, true, 5);
    this.hRect.setColor(this.colors.header);
    this.hRect.setStroke({
      color: this.colors.background,
      width: 0.5
    });
    this.clip = this.hRect.createClipPath(0);
    this.hRect.setClipPath(this.clip.id);
    this.elements.push({ element: this.clip, render: (el) => el.element });
    this.elements.push({ element: this.hRect, render: (el) => el.createSVGElement() });

    this.connectors = new Viewport(0, 47.5 * this.scale);
    this.elements.push({ element: this.connectors });

    this.body = new Viewport(0, 37.5 * this.scale);
    this.elements.push({ element: this.body });

    this.sockets = [];
    this.inputSockets = [];
    this.outputPlugs = [];
    this.labels = [];
    this.plugs = [];
    this.connectors.addComponent(this.sockets, (el) => {return el.map(e => e.createSVGElement());});
    this.connectors.addComponent(this.labels, (el) => {return el.map(e => e.createSVGElement());});
    this.connectors.addComponent(this.plugs, (el) => {return el.map(e => e.createSVGElement());});
    this.body.addComponent(this.inputSockets, (el) => {return el.map(e => e.createSVGElement());});
    this.body.addComponent(this.outputPlugs, (el) => {return el.map(e => e.createSVGElement());});
    this.connectionOffset = 0;

    this.outgoingConnectors = [];
    this.incomingConnectors = [];

    this.dragHandler = new NodeDragAttachment(() => {
      this.moveToTop();
      let move = (plug) => {
        plug.renderContainer = this.parentSVGEngine.element;
        plug.connected.forEach((connector) => {
          connector.renderContainer = this.parentSVGEngine.element;
          connector.moveToTop();
        });
      }
      let moveSocket = (socket) => {
        socket.renderContainer = this.parentSVGEngine.element;
        if (!socket.connected) return;
        socket.connector.renderContainer = this.parentSVGEngine.element;
        socket.connector.moveToTop();
      }
      this.plugs.forEach(plug => {
        move(plug);
      });
      this.outputPlugs.forEach(plug => {
        move(plug);
      });
      this.inputSockets.forEach(socket => {
        moveSocket(socket);
      });
      this.sockets.forEach(socket => {
        moveSocket(socket);
      });
    });
    this.dragHandler.attach(this);

    this.eventElem = document.createElement("span");
    this.events = {
      move: new CustomEvent("move", { detail: {node: this} })
    }

    this.renderContainer = this.parentSVGEngine.element;

    return this;
  }
  get renderContainer() {
    // getter to keep return an up-to-date copy of the element by the svg engine, even if it changes
    return this.parentSVGEngine.renderElement;
  }
  set renderContainer(_i) {
    // console.warn("Don't do that! [Node.renderContainer is readonly] trying to set to '" + i +"'");
  }
  clearConnections() {
    console.log("clear", this);
  }
  createSVGElement() {
    if (this.embedContainer) {
      this.body.createSVGElement();
      this.connectors.createSVGElement();
      this.embedContainer.append(this.connectors.container, this.body.container);
      return this.embedContainer; // don't execute the inherited function
    }
    return super.createSVGElement();
  }
  embedBody(container, node) { // Embed all the connectors and similar in another element
    this.embedContainer = container;
    this.embedNode = node;
  }
  setConnectorType(type) {
    this.plugs.forEach((plug) => {
      plug.setConnectorType(type);
    });
    this.outputPlugs.forEach((plug) => {
      plug.setConnectorType(type);
    });
  }
  addEventListener(event, cb) {
    return (this.embedNode.eventElem || this.eventElem).addEventListener(event, cb);
  }
  emit(event) {
    const e = this.events[event];
    if (!e) {
      console.error("Unknown event '" + event + "'! At Node.emit()");
      return;
    }
    this.eventElem.dispatchEvent(e);
  }
  setPosition(pos) {
    super.setPosition(pos);
    this.emit("move");
  }
  update() {
    /*this.elements.forEach((e, i) => {

    });*/
  }
  setSubComponentAttributes() {
    this.bgRect.setScale(this.scale);
    this.hRect.setScale(this.scale);
    this.nText.setScale(this.scale);

    this.nText.setPosition({
      x: 5 * this.scale,
      y: 20 * this.scale
    });
    this.hText.setScale(this.scale); // class name
    let metrics = Text.measureText(this.hText.txt, "14px Times New Roman");
    this.hText.setPosition({
      x: this.tw - metrics.width * this.scale,
      y: 26 * this.scale
    });
    this.labels.forEach(label => {
      label.setScale(this.scale);
    });
    this.sockets.forEach((socket, i) => {
      socket.setPosition({
        x: -8 * this.scale,
        y: (this.th * 0.2) + 25 * this.scale + (36 * i) * this.scale
      });
      socket.setScale(this.scale);
    });
    this.plugs.forEach((plug, i) => {
      plug.setPosition({
        x: this.tw - (36 - 8) * this.scale,
        y: (this.th * 0.2) + 25*this.scale + (36 * i) * this.scale
      })
      plug.setScale(this.scale);
    });
  }
  setScale(s) {
    this.scale = s;
    super.updateAttributes();
    this.setSubComponentAttributes();
  }
  addAttachment(at) { // attachments like the move listener
    this.attachments.push(at);
    at.attach(this);
  }
  setName(name) {
    this.name = name;
    if (!this.nText) {
      this.nText = new Text(5*this.scale, 10*this.scale, name, this.scale, Text.Anchor.START, Text.VerticalAnchor.TOP);
      this.nText.setColor("white");
      this.elements.push({ element: this.nText, render: (el) => el.createSVGElement() });
      return;
    }
    return this.nText.setText(name);
  }
  setClass(c) {
    this.class = c;
    let className = Node.ClassName[c];
    let classColor = Node.ClassColor[c];
    this.hRect.setColor(classColor);
    this.hText = new Text(this.tw - (5 * this.scale), 12 * this.scale, className, 1 * this.scale, Text.Anchor.END, Text.VerticalAnchor.TOP);
    this.hText.fontSize = 12 * this.scale;
    this.hText.setColor("white");
    this.elements.push({ element: this.hText, render: (el) => el.createSVGElement() });
  }
  setConnectionOffset(delta) {
    this.connectionOffset = delta;
    this.bgRect.setHeight(this.bgRect.height +  delta);
  }
  addSocket() {
    const socket = new InputSocketComponent((-8 * this.scale), (36 * this.sockets.length + this.connectionOffset) * this.scale, 16, 34, this.scale, InputSocketComponent.Type.CONNECTOR, (this.embedNode || this));

    const currLength = Math.max(this.plugs.length, this.sockets.length);

    this.sockets.push(socket);

    if (this.sockets.length > currLength) {
      let diff = this.sockets.length - currLength;
      this.bgRect.setHeight(this.bgRect.height + (36 * diff) * this.scale);
      this.body.setPosition({ x: 0, y: this.body.y + (36 * diff + this.connectionOffset) * this.scale });
    }

    return this.sockets;
  }
  addPlug(label, style) {
    //let metrics = Text.measureText(label);
    const text = new Text(this.tw - (34) * this.scale, (38 * this.plugs.length + this.connectionOffset) * this.scale, label, this.scale, Text.Anchor.END, Text.VerticalAnchor.TOP);
    text.setColor("white");
    this.labels.push(text);

    const currLength = Math.max(this.plugs.length, this.sockets.length);

    const plug = new OutputPlugComponent(this.tw - (36 - 8) * this.scale, (36 * this.plugs.length + this.connectionOffset) * this.scale, 16, 34, this.scale, OutputPlugComponent.Type.CONNECTOR, this.parentSVGEngine, (this.embedNode || this), style);
    this.plugs.push(plug);

    plug.addEventListener("connector", (e) => {
      this.outgoingConnectors.push(e);
    });
    plug.addEventListener("connectordestroy", (e) => {
      const idx = this.outgoingConnectors.findIndex(el => el.id == e.id);
      if (idx === -1) return;
      this.outgoingConnectors.splice(idx, 1);
    });

    if (this.plugs.length > currLength) {
      let diff = this.plugs.length - currLength;
      this.bgRect.setHeight(this.bgRect.height + (36 * diff) * this.scale);
      this.body.setPosition({ x: 0, y: this.body.y + (36 * diff + this.connectionOffset) * this.scale });
    }

    return this.plugs;
  }
  addInputSocket(type, label) {
    const socket = new InputSocketComponent((-8 * this.scale), (28 * this.inputSockets.length) * this.scale, 16*this.scale, 34*this.scale, this.scale, type, (this.embedNode || this), label);

    const currLength = Math.max(this.inputSockets.length, this.outputPlugs.length);
    this.inputSockets.push(socket);

    if (this.inputSockets.length > currLength) {
      let diff = this.inputSockets.length - currLength;
      this.bgRect.setHeight(this.bgRect.height + (28 * diff) * this.scale);
    }

    return this.inputSockets;
  }
  addOutputPlug(type, label, style) {
    const plug = new OutputPlugComponent(this.tw - (36 - 8) * this.scale, (28 * this.outputPlugs.length) * this.scale, 16, 34, this.scale, type, this.parentSVGEngine, (this.embedNode || this), style, label);

    plug.addEventListener("connector", (e) => {
      this.outgoingConnectors.push(e);
    });
    plug.addEventListener("connectordestroy", (e) => {
      const idx = this.outgoingConnectors.findIndex(el => el.id == e.id);
      if (idx === -1) return;
      this.outgoingConnectors.splice(idx, 1);
    });

    const currLength = Math.max(this.inputSockets.length, this.outputPlugs.length);
    this.outputPlugs.push(plug);

    if (this.outputPlugs.length > currLength) {
      let diff = this.outputPlugs.length - currLength;
      this.bgRect.setHeight(this.bgRect.height + (28 * diff) * this.scale);
    }
    return this.outputPlugs;
  }
}
class ConditionNode extends Node {
  constructor(x, y, scale, svgEngine, type="") {
    super(x, y, scale, svgEngine);

    this.setName("If");
    this.setClass(Node.Class.BASIC);

    this.addSocket(); // connector in/out-puts
    this.addPlug("Met", type); // if block
    this.addPlug("Not met", type); // else block
    // data inputs
    this.addInputSocket(InputSocketComponent.Type.BOOLEAN, "Condition", type);

    return this;
  }
  simulate(state) {
    this.labels[1 - state].setColor("white");
    this.labels[state].setColor("rgba(255, 255, 255, 0.3)");
    this.plugs[1 - state].setOpacity(1);
    this.plugs[state].setOpacity(0.3);
  }
}
class IsMobileNode extends Node {
  constructor(x, y, scale, svgEngine, type="") {
    super(x, y, scale, svgEngine);

    this.setName("Is Mobile");
    this.setClass(Node.Class.DEVICEINFO);


    this.addOutputPlug(OutputPlugComponent.Type.BOOLEAN, "Is Mobile", type);

    return this;
  }
}
class ScreenSizeNode extends Node {
  constructor(x, y, scale, svgEngine, type="") {
    super(x, y, scale, svgEngine);

    this.setName("Screen Size");
    this.setClass(Node.Class.DEVICEINFO);

    this.addOutputPlug(OutputPlugComponent.Type.INTEGER, "Pixels X", type);
    this.addOutputPlug(OutputPlugComponent.Type.INTEGER, "Pixels Y", type);

    return this;
  }
}
class AdditionNode extends Node {
  constructor(x, y, scale, svgEngine, type="", embed=null, embedNode=null) {
    super(x, y, scale, svgEngine);

    this.setName("Add (Math)");
    this.setClass(Node.Class.BASIC);

    if (embed) this.embedBody(embed, embedNode);

    this.addInputSocket(InputSocketComponent.Type.NUMBER,"A", type);
    this.addInputSocket(InputSocketComponent.Type.NUMBER,"B", type);

    this.addOutputPlug(OutputPlugComponent.Type.NUMBER, "Result", type);

    return this;
  }
}
class MultiplicationNode extends Node {
  constructor(x, y, scale, svgEngine, type="", embed=null, embedNode=null) {
    super(x, y, scale, svgEngine);

    this.setName("Multiply (Math)");
    this.setClass(Node.Class.BASIC);

    if (embed) this.embedBody(embed, embedNode);

    this.addInputSocket(InputSocketComponent.Type.NUMBER,"A", type);
    this.addInputSocket(InputSocketComponent.Type.NUMBER,"B", type);

    this.addOutputPlug(OutputPlugComponent.Type.NUMBER, "Product", type);

    return this;
  }
}
class MathNode extends Node {
  constructor(x, y, scale, svgEngine, type="") {
    super(x, y, scale, svgEngine);

    this.setName("Add (Math)"); // default math operation
    this.setClass(Node.Class.BASIC);

    this.cStyle = type; // connector design

    this.setConnectionOffset(28 * this.scale);

    this.opSelect = new SVGSelect(10 * this.scale, 42 * this.scale, 180, this.scale, (data) => this.switched(data));
    this.opSelect.addItem("Add (Math)", "add-concat");
    this.opSelect.addItem("Multiply (Math)", "multiply");
    this.opSelect.selected.container.innerHTML = "Add (Math)";
    // select has to be rendered last

    this.embeds = new Viewport(0, 30 * this.scale);
    this.elements.push({ element: this.embeds });

    const config = { attributes: true, childList: true, subtree: true };
    const callback = (mutationList) => {
      for (var mutation of mutationList) {
        if (mutation.type == "attributes" || mutation.type == "childList") {
          this.bgRect.setHeight((45 + this.embeds.y) * this.scale + this.embeds.container.getBBox().height);
        }
      }
    }
    this.elements.push({ element: this.opSelect });

    const observer = new MutationObserver(callback);
    observer.observe(this.embeds.container, config);

    this.init = true;
    this.setupBody("add-concat");

    return this;
  }
  createSVGElement() {
    return super.createSVGElement();
  }
  transfer(node) {
    this.plugs = node.plugs;
    this.sockets = node.sockets;
    this.outputPlugs = node.outputPlugs;
    this.inputSockets = node.inputSockets;
    this.labels = node.labels;
  }
  setupBody(id) {
    this.clearConnections();
    this.embeds.container.innerHTML = "";
    switch(id) {
      case "add-concat":
        const addition = new AdditionNode(0, 0, this.scale, this.parentSVGEngine, this.cStyle, this.embeds.container, this);
        this.elements.push({ element: addition, render: (el) => {
          el.createSVGElement();
        }});
        this.transfer(addition);
        console.log(this);
        if (!this.init) return addition.createSVGElement();
        this.init = false;
      break;
      case "multiply":
        const mult = new MultiplicationNode(0, 0, this.scale, this.parentSVGEngine, this.cStyle, this.embeds.container, this);
        this.elements.push({ element: mult, render: (el) => {
          el.createSVGElement();
        }});
        this.transfer(mult);
        if (!this.init) return mult.createSVGElement();
        this.init = false;
      break;
      default:
        console.warn("Suspicious case detected 🤨: ", id);
      break;
    }
  }
  switched(item) {
    this.type = item.selected;
    this.setName(item.label);
    this.setupBody(item.selected);
  }
}
class StartEventNode extends Node {
  constructor(x, y, scale, svgEngine, type="") {
    super(x, y, scale, svgEngine);

    this.setName("Start");
    this.setClass(Node.Class.EVENT);

    this.addPlug("Start", type);

    return this;
  }
}
class Attachment {
  constructor() {
    this.node = null;

    return this;
  }
  attach(node) {
    this.node = node;
  }
}
class NodeDragAttachment extends Attachment {
  constructor(onStart=null) {
    super();

    this.onStart = onStart;

    this.dragging = false;
    this.mouseStartPos = {}; // the mouse position when you start dragging to calc the offset
    this.mouseElemOffset = {}; // offset of the mouse position to the element

    this.interactions = new UserInteractionManager();

    return this;
  }
  attach(node) {
    super.attach(node);
    this.interactions.initListeners(node.hRect.elem, (e) => {
      // mousedown
      if (this.onStart) this.onStart(e);
      this.mouseStartPos = {
        x: e.clientX,
        y: e.clientY
      };
      this.nodeStartPos = {
        x: this.node.x,
        y: this.node.y
      }
      this.dragging = true;
    }, () => {}, () => {
      // mouseup
      this.mouseStartPos = {};
      this.dragging = false;
    }, 1);
    this.interactions.initListeners(window, () => {}, (e) => {
      // mousemove
      if (!this.dragging) return;
      let xDiff = e.clientX - this.mouseStartPos.x;
      let yDiff = e.clientY - this.mouseStartPos.y;
      let x = this.nodeStartPos.x + xDiff;
      let y = this.nodeStartPos.y + yDiff;
      this.node.setPosition({ x: x, y: y });
    }, () => {});
  }
}
class Connector extends Component {
  static typesCompatible(input, output) {
    // input == the socket
    // output == the plug
    if (input == InputSocketComponent.Type.ANY) return true;
    if (input == output) return true;
    const compatible = {
      [InputSocketComponent.Type.NUMBER]: [
        InputSocketComponent.Type.INTEGER,
        InputSocketComponent.Type.FLOAT
      ]
    };
    if (!compatible[input]) return false;
    if (compatible[input].includes(output)) return true;
    return false;
  }
  switchType(type) {
    const desired = new (ConnectorManager.getConnector(type))(this.plug, this.currMousePos, this.absCoords, this.scale, this.color);
    desired.moveTo(this.currMousePos);
    desired.moveStartTo(this.startPos);
    desired.elements.forEach(e => {
      this.container.appendChild(e.render(e.element));
    });
    this.desired = desired;
    this.sCircle.container.remove();
    this.line.container.remove();
    this.eCircle.container.remove();
  }
  constructor(plug, mousePos, absPlugCoords, scale) {
    const startPos = absPlugCoords; // component stuff
    let x = startPos.x + 8 * scale;
    let y = startPos.y + 8 * scale;
    let width = mousePos.x - x;
    let height = mousePos.y - y;
    super(x, y, width, height, scale);

    console.log(this);

    window.openVS.connectors.push(this); // TODO: z-index stuff, you know what to do

    this.eventElem = document.createElement("span");

    this.plug = plug;
    this.currMousePos = mousePos;
    this.absCoords = absPlugCoords;
    this.id = uid();
    this.startPos = { x: this.x, y: this.y };

    return this;
  }
  addEventListener(event, cb) {
    return this.eventElem.addEventListener(event, cb);
  }
  emit(event, data) {
    return this.eventElem.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  destroy() {
    this.container.remove();
    return;
  }
  moveTo(mousePos) {
    if (this.desired) return this.desired.moveTo(mousePos);
    this.currMousePos = mousePos;
  }
  moveStartTo(mousePos) {
    if (this.desired) return this.desired.moveStartTo(mousePos);
    this.startPos = mousePos;
    this.setPosition(mousePos); // relocate svg container
  }
  attachStartListener(el) {
    this.plug.interactions.initListeners(el, (e) => {
      this.plug.mouseDown(e);
    }, () => {}, () => {});
  }
  attachMoveListener(el) { // the event to relocate the connector
    this.plug.interactions.initListeners(el, () => {
      this.plug.dragging = true; // the moving and destroying is done in the plugcomponent
      this.plug.snapping = false;
      this.connectedTo.connected = false;
      this.connectedTo.disconnect();
      this.connectedTo = { id: null };
      this.connectedNode = null;
      this.plug.connected = this.plug.connected.splice(this.plug.connected.findIndex(el => el.id == this.id), 1);
      this.plug.initSnapping();
      this.plug.activeConnector = this;
    }, () => {}, () => {});
  }
}
class BezierConnector extends Connector {
  constructor(plug, mousePos, absPlugCoords, scale, color) {
    super(plug, mousePos, absPlugCoords, scale);

    this.color = color;

    this.sCircle = new Circle(0, 0, 6 * this.scale, false); // the circle connected to the output plug
    this.sCircle.setColor(this.color);
    this.elements.push({ element: this.sCircle, render: (el) => el.createSVGElement() });
    super.attachStartListener(this.sCircle.container);

    const end = {
      x: this.currMousePos.x - this.x,
      y: this.currMousePos.y - this.y
    }

    this.group = new Group();
    super.attachMoveListener(this.group.container);
    this.elements.push({ element: this.group, render: (el) => el.createSVGElement() });

    this.pathBuilder = new PathBuilder();
    this.pathBuilder.moveTo(0, 0);
    this.pathBuilder.cubicCurve(end.x / 2, 0, end.x / 2, end.y, end.x, end.y);
    this.d = this.pathBuilder.build();
    this.line = new Path();
    this.line.path = this.d;
    this.line.setColor("transparent");
    this.line.setStroke({
      stroke: this.color,
      width: 3 * this.scale
    });
    this.group.addComponent(this.line);

    this.eCircle = new Circle(end.x, end.y, 6 * this.scale, false);
    this.eCircle.setColor(this.color);
    this.group.addComponent(this.eCircle);
  }
  update() {
    const end = {
      x: this.currMousePos.x - this.x,
      y: this.currMousePos.y - this.y
    }

    this.pathBuilder.clear();
    this.pathBuilder.moveTo(0, 0);
    this.pathBuilder.cubicCurve(end.x / 2, 0, end.x / 2, end.y, end.x, end.y);
    this.line.path = this.pathBuilder.build();
    this.eCircle.setPosition({ x: end.x, y: end.y});
  }
  moveTo(mousePos) {
    super.moveTo(mousePos);

    this.update()
  }
  moveStartTo(mousePos) {
    super.moveStartTo(mousePos);

    this.update();
  }
}
class LineConnector extends Connector {
  constructor(plug, mousePos, absPlugCoords, scale, color) {
    super(plug, mousePos, absPlugCoords, scale);

    this.color = color;

    this.sCircle = new Circle(0, 0, 6 * this.scale, false); // the circle connected to the output plug
    this.sCircle.setColor(this.color);
    this.elements.push({ element: this.sCircle, render: (el) => el.createSVGElement() });
    super.attachStartListener(this.sCircle.container);

    this.group = new Group();
    this.elements.push({ element: this.group, render: (el) => el.createSVGElement() });
    super.attachMoveListener(this.group.container);

    this.line = new Line(0, 0, this.currMousePos.x - this.x, this.currMousePos.y - this.y, 3 * this.scale);
    this.line.setColor(this.color);
    this.group.addComponent(this.line);

    this.eCircle = new Circle(this.currMousePos.x - this.x, this.currMousePos.y - this.y, 6 * this.scale, false);
    this.eCircle.setColor(this.color);
    this.group.addComponent(this.eCircle);

    return this;
  }
  update() {
    const mousePos = this.mousePos;
    this.line.setPosition({x: 0, y: 0}, { x: mousePos.x - this.x, y: mousePos.y - this.y});
    this.eCircle.setPosition({ x: mousePos.x - this.x, y: mousePos.y - this.y });
  }
  moveTo(mousePos) {
    super.moveTo(mousePos);

    this.mousePos = mousePos;
    this.update(mousePos);
  }
  moveStartTo(mousePos) {
    super.moveStartTo(mousePos);

    this.update();
  }
}
class ConnectorManager {
  static BEZIER = BezierConnector;
  static LINE = LineConnector;

  static getConnector(type) {
    switch(type) {
      case "bezier":
        return ConnectorManager.BEZIER;
      case "line":
        return ConnectorManager.LINE;
      default:
        return ConnectorManager.BEZIER;
    }
  }

  constructor() {
    return this;
  }
}
class Text {
  static Anchor = {
    START: "start",
    MIDDLE: "middle",
    END: "end"
  }
  static VerticalAnchor = {
    TOP: "hanging",
    MIDDLE: "middle",
    BOTTOM: "auto"
  }
  constructor(x, y, text, scale, anchor=Text.Anchor.START, vAnchor=Text.VerticalAnchor.BOTTOM) {
    this.x = x;
    this.y = y;
    this.txt = text;
    this.scale = scale;
    this.anchor = anchor;
    this.vAnchor = vAnchor;
    this.isComponent = true;

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "text");
    this.container.style.userSelect = "text";
    this.updateAttributes();
  }
  set fontSize(s) {
    this.fs = s;
    this.container.style.fontSize = s + "px";
  }
  get fontSize() {
    return this.fs;
  }
  static getCSSStyle(el, prop) {
    return window.getComputedStyle(el, null).getPropertyValue(prop);
  }
  static getCanvasFont(el=document.body) {
    const fontWeight = Text.getCSSStyle(el, 'font-weight') || 'normal';
    const fontSize = Text.getCSSStyle(el, 'font-size') || '16px';
    const fontFamily = Text.getCSSStyle(el, 'font-family') || 'Times New Roman';

    return `${fontWeight} ${fontSize} ${fontFamily}`;
  }
  static measureText(text, font=Text.getCanvasFont()) {
    window.openvs_canvas = window.openvs_canvas || (window.openvs_canvas = document.createElement("canvas"));
    const context = window.openvs_canvas.getContext("2d");
    context.font = font;
    const metrics = context.measureText(text);
    metrics.fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    metrics.height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    return metrics;
  }
  setColor(color) {
    this.color = color;
    this.updateAttributes();
  }
  updateAttributes() {
    const text = this.container;
    text.innerHTML = this.txt;
    text.style.textAnchor = this.anchor;
    text.style.dominantBaseline = this.vAnchor; // the vertical alignment
    text.setAttribute("x", this.x);
    text.setAttribute("y", this.y);
    if (this.color) text.setAttribute("fill", this.color);
    if (this.scale) text.style.transform = "scale(" + this.scale + ")";
  }
  setPosition(pos) {
    this.x = pos.x;
    this.y = pos.y;
  }
  setScale(scale) {
    this.scale = scale
    this.updateAttributes();
  }
  setText(t) {
    this.txt = t;
    this.container.innerHTML = t;
  }
  createSVGElement() {
    return this.container;
  }
}
class Line {
  constructor(x, y, x1, y1, width) {
    this.x = x;
    this.y = y;
    this.x1 = x1; // end position of the current connector
    this.y1 = y1;
    this.width = width;
    this.isComponent = true;

    this.d = ""; // path instructions
    this.color = "";

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.updateAttributes();

    return this;
  }
  setColor(color) {
    this.color = color;
    this.updateAttributes();
  }
  setPosition(pos1, pos2) {
    this.x = pos1.x;
    this.y = pos1.y;
    this.x1 = pos2.x;
    this.y1 = pos2.y;
    this.updateAttributes();
  }
  updateAttributes() {
    const path = this.container;
    this.d = "M " + this.x + " " + this.y + " "; // start position
    this.d += "L " + this.x1 + " " + this.y1; // end position
    path.setAttribute("d", this.d);
    path.setAttribute("stroke-width", this.width);
    if (this.color) path.setAttribute("stroke", this.color);
  }
  createSVGElement() {
    return this.container;
  }
}
class Path {
  constructor() {
    this.container = document.createElementNS("http://www.w3.org/2000/svg", "path");

    return this;
  }
  set path(d) {
    this.d = d;
    this.updateAttributes();
  }
  get path() {
    return this.d;
  }
  setStroke(opts) {
    this.stroke = opts.stroke;
    this.strokeWidth = opts.width;
    this.updateAttributes();
  }
  setColor(c) {
    this.fill = c;
    this.updateAttributes();
  }
  updateAttributes() {
    this.container.setAttribute("stroke", this.stroke);
    this.container.setAttribute("stroke-width", this.strokeWidth);
    this.container.setAttribute("fill", this.fill);
    this.container.setAttribute("d", this.d);
  }
  createSVGElement() {
    return this.container
  }
}
class PathBuilder {
  constructor() {
    this.instructions = [];

    return this;
  }
  build() {
    return this.instructions.reduce((prev, curr) => {
      if (typeof prev != "string") {
        return prev.command + prev.content + curr.command + curr.content;
      }
      return prev + curr.command + curr.content;
    });
  }
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  moveTo(x, y, relative=false) {
    const instruction = {
      command: (relative) ? "m" : "M",
      content: " " + x + " " + y,
      id: this.uid()
    }
    this.instructions.push(instruction);
    return instruction.id;
  }
  lineTo(x, y, relative=false) {
    const instruction = {
      command: (relative) ? "l" : "L",
      content: " " + x + " " + y,
      id: this.uid()
    }
    this.instructions.push(instruction);
    return instruction.id;
  }
  cubicCurve(x1, y1, x2, y2, x, y, relative=false) {
    const instruction = {
      command: (relative) ? "c" : "C",
      content: " " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + x + " " + y,
      id: this.uid()
    }
    this.instructions.push(instruction);
    return instruction.id;
  }
  closePath() {
    const instruction = {
      command: "Z",
      content: "",
      id: this.uid()
    };
    this.instructions.push(instruction);
    return instruction.id;
  }
  getInstruction(id) {
    return this.instructions.filter(el => el.id == id)[0];
  }
  clear() {
    this.instructions = [];
  }
}
class Circle {
  constructor(x, y, radius, cornerCoords) {
    this.x = (cornerCoords) ? x + radius : x;
    this.y = (cornerCoords) ? y + radius : y;
    this.ox = x; // original x and y
    this.oy = y;
    this.r = radius;
    this.cornerCoords = cornerCoords;
    this.isComponent = true;

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    this.updateAttributes();

    return this;
  }
  addEventListener(event, cb) {
    this.container.addEventListener(event, cb);
  }
  set radius(r) {
    this.r = r;
    if (!this.cornerCoords) return this.updateAttributes();
    this.x = this.ox + r;
    this.y = this.oy + r;
    return this.updateAttributes();
  }
  get radius() {
    return this.r;
  }
  setRadius(r, changePos=false) {
    this.r = r;
    if (!changePos || !this.cornerCoords) return this.updateAttributes();
    this.x = this.ox + r;
    this.y = this.oy + r;
    return this.updateAttributes();
  }
  setPosition(pos) {
    this.x = (this.cornerCoords) ? pos.x + this.r : pos.x;
    this.y = (this.cornerCoords) ? pos.y + this.r : pos.y;
    this.updateAttributes();
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
    return this.container;
  }
}
class Rectangle {
  constructor(x, y, width, height, rounded=false, radius=0) {
    this.x = x;
    this.y = y;
    this.height = height;
    this.width = width;
    this.oheight = JSON.parse(JSON.stringify(height));
    this.owidth = JSON.parse(JSON.stringify(width));
    this.rounded = rounded;
    this.isComponent = true;

    this.radius = radius;
    this.oradius = JSON.parse(JSON.stringify(radius));
    this.rx = (radius !== 0) ? radius : 0.3;
    this.ry = (radius !== 0) ? radius : 0.3;

    this.shadow = null;

    this.eventElem = document.createElement("span");
    this.clickEvent = new Event("click");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    this.elem = rect;

    return this;
  }
  setPosition(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.updateAttributes();
  }
  setColor(color) {
    this.color = color;
  }
  setStroke(opts) {
    this.stroke = opts.color;
    this.strokeWidth = opts.width;
    this.updateAttributes();
  }
  setShadow(shadow) {
    this.shadow = shadow;
  }
  setClipPath(path) {
    this.clipPath = path;
  }
  addEventListener(event, cb) {
    //return this.eventElem.addEventListener(event, cb);
    return this.elem.addEventListener(event, cb);
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
  setHeight(h) {
    this.height = (this.scale) ? h * this.scale : h;
    this.oheight = h;
    this.updateAttributes();
  }
  setWidth(w) {
    this.width = (this.scale) ? w * this.scale : w;
    this.owidth = w;
    this.updateAttributes();
  }
  updateAttributes() {
    const rect = this.elem;
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
    this.updateAttributes();
    /*rect.onclick = () => {
      this.eventElem.dispatchEvent(this.clickEvent);
    }*/
    return this.elem;
  }
  updateClip() {
    const e = document.querySelector("#" + this.clipPath); // get the clipPath element
    e.setAttribute("width", this.width);
    e.setAttribute("height", this.height + this.rx);

    const rect = e.children[0];
    rect.setAttribute("rx", this.rx);
    rect.setAttribute("ry", this.ry);
    rect.setAttribute("width", this.width);
    rect.setAttribute("height", this.height + this.rx);
  }
  setScale(scale) {
    this.scale = scale;
    this.height = this.oheight * scale; // oheight, owidth, etc to use the original values
    this.width = this.owidth * scale;
    this.radius = this.oradius * scale;
    this.rx = (this.radius !== 0) ? this.radius : 0.3;
    this.ry = (this.radius !== 0) ? this.radius : 0.3;
    if (this.clipPath) {
      this.updateClip();
    }
    this.updateAttributes();
  }
}
class SVGSelect extends Component {
  constructor(x, y, width, scale, cb=null) {
    super(x, y, width, 18, scale);

    this.callback = cb;
    this.maxHeight = (18 * 5 + 4) * this.scale

    this.dropRect = new Rectangle(0, 0, this.tw, this.th, true, 3);
    this.dropRect.setColor("#121212");
    this.dropRect.setStroke({
      color: "#0f0f0f",
      width: 1
    });
    this.dropRect.elem.style.overflow = "scroll";
    this.dropRect.elem.style.transition = "0.2s";
    this.elements.push({ element: this.dropRect });

    this.body = new ScrollComponent(0, this.th, this.tw, 0, scale);
    this.body.rect.style.transition = "0.2s";
    this.elements.push({ element: this.body });

    this.bgRect = new Rectangle(0, 0, this.tw, this.th, true, 3);
    this.bgRect.setColor("#121212");
    this.bgRect.setStroke({
      color: "#0f0f0f",
      width: 1
    });
    this.bgRect.elem.id = "bgRect";
    this.elements.push({ element: this.bgRect });

    this.selected = new Text(3, 3.5, "", this.scale, Text.Anchor.START, Text.VerticalAnchor.TOP);
    this.selected.container.style.fontSize = (14 * this.scale) + "px";
    this.selected.container.style.userSelect = "none";
    this.selected.container.id = uid();
    this.selected.setColor("#808080");
    this.elements.push({ element: this.selected });

    this.builder = new PathBuilder();
    this.builder.moveTo(this.tw - 10, 7);
    this.builder.lineTo(3, 4, true);
    this.builder.lineTo(3, -4, true);
    this.path = new Path();
    this.path.path = this.builder.build();
    this.path.setColor("transparent");
    this.path.setStroke({
      stroke: "#808080",
      width: 1
    });
    this.default = this.builder.build();
    this.path.container.style.strokeLinejoin = "round";
    this.path.container.style.strokeLinecap = "round";
    this.path.container.style.transition = "0.2s";
    this.path.container.id = "arrow";
    this.elements.push({ element: this.path });

    // the d attribute for the upside-down arrow onclick with animation
    this.builder.clear();
    this.builder.moveTo(this.tw - 10, 11);
    this.builder.lineTo(3, -4, true);
    this.builder.lineTo(3, 4, true);
    this.flipped = this.builder.build();

    this.expanded = 0;
    this.items = [];

    this.container.addEventListener("pointerup", (e) => {
      if (e.target.id == this.bgRect.elem.id || e.target.id == this.path.container.id || e.target.id == this.selected.container.id) {
        this.toggle();
      }
    });

    return this;
  }
  addItem(label, id, cb=null) {
    const text = new Text(3, (18 * (this.items.length + 1) - 3) * this.scale, label, this.scale, Text.Anchor.START, Text.VerticalAnchor.BOTTOM);
    text.setColor("#808080");
    this.body.addComponent(text);
    this.items.push({ id: id, elem: text, cb: cb });
    text.container.addEventListener("pointerup", (e) => {
      const data = {
        selected: id,
        label: label,
        target: e.target
      };
      if (cb) cb(data);
      if (this.callback) this.callback(data);
      this.selected.setText(label);
      this.expanded = 0;
      this.collapse();
    });
  }
  toggle() {
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
    this.expanded = 1 - this.expanded; // math magic :D
  }
  expand() {
    this.bgRect.setStroke({
      color: "black",
      width: 1
    });
    this.path.container.style.d = 'path("' + this.flipped + '")';

    const h = Math.min(this.maxHeight, (18 * (this.items.length + 1)) * this.scale);
    this.dropRect.setHeight(h);
    this.body.setHeight(h - this.th);
  }
  collapse() {
    this.bgRect.setStroke({
      color: "#0f0f0f",
      width: 1
    });
    this.path.container.style.d = 'path("' + this.default + '")';
    this.dropRect.setHeight(this.th);
    this.body.setHeight(0);
  }
}
class ScrollComponent extends Component {
  constructor(x, y, width, height, scale) {
    super(x, y, width, height, scale);

    this.defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    this.elements.push({ element: this.defs, render: (el) => el });

    this.cPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    this.cPath.id = uid();
    this.defs.appendChild(this.cPath);
    this.rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    this.rect.setAttribute("x", 0);
    this.rect.setAttribute("y", 0);
    this.rect.setAttribute("width", width);
    this.rect.setAttribute("height", height);
    this.cPath.appendChild(this.rect);

    this.container.style.overflow = "overlay";
    this.container.setAttribute("clip-path", "url(#" + this.cPath.id + ")");

    this.content = new Viewport(0, 0);
    this.baseScrollDelta = 150;
    this.container.addEventListener("wheel", (e) => {
      if (e.cancelable) e.preventDefault();
      let sY = Math.min(this.scrollY + (this.th * 0.2) * (this.baseScrollDelta / e.deltaY), this.th - (this.content.container.getBBox().height - this.th));
      this.scrollTo(0, (sY < 0) ? 0 : sY);
    });
    this.tPosY;
    this.container.addEventListener("touchstart", (e) => {
      this.tPosY = e.changedTouches[0].clientY;
    });
    this.container.addEventListener("touchmove", (e) => {
      if (e.cancelable) e.preventDefault();
      let newPos = e.changedTouches[0].clientY;
      if (this.tPosY > newPos) {
        let sY = Math.min(this.scrollY + ((this.content.container.getBBox().height - this.th) * 0.2), this.th - (this.content.container.getBBox().height - this.th));
        this.scrollTo(0, (sY < 0) ? 0 : sY);
      } else {
        let sY = Math.min(this.scrollY + ((this.content.container.getBBox().height - this.th) * -0.2), this.th - (this.content.container.getBBox().height - this.th));
        this.scrollTo(0, (sY < 0) ? 0 : sY);
      }
    });
    this.elements.push({ element: this.content });

    const scrollHeight = this.th;
    this.scrollBar = new Rectangle(this.tw - 2 - 5, 0, 5, scrollHeight, true, 2);
    this.scrollBar.setColor("#060606");
    this.elements.push({ element: this.scrollBar });

    this.scrollY = 0;

    return this;
  }
  scrollTo(x, y) {
    this.scrollY = y;
    this.content.setPosition({ x: -1 * x, y: -1 * y });

    // move scroll bar
    let factor = y / (this.content.container.getBBox().height - this.th);
    this.scrollBar.setPosition({ x: this.scrollBar.x, y: y * factor });
  }
  setHeight(h) {
    this.height = h;
    this.th = h * this.scale;
    this.rect.setAttribute("height", h);

    // height * (percentage of the overlapping content towards the current height)
    const height = (this.th * ((this.content.container.getBBox().height - this.th) / 100));
    this.scrollBar.setHeight(height);
  }
  setWidth(w) {
    this.width = w;
    this.tw = w * this.scale;
    this.rect.setAttribute("width", w);
  }
  addComponent(c, render=(el)=>el.createSVGElement()) {
    this.content.addComponent(c, render);
  }
}
class SVGCheckbox extends Component {
  constructor(x, y, scale, checked=false, clickCallback=()=>{}) {
    super(x, y, 18, 18, scale);

    this.checked = checked;
    this.toggled = (checked) ? 1 : 0;
    this.clickCallback = clickCallback;

    // the box
    this.bgRect = new Rectangle(0, 0, this.tw, this.th, true, 3);
    this.bgRect.setColor("#121212");
    this.bgRect.setStroke({
      color: "#0f0f0f",
      width: 1
    });
    this.elements.push({ element: this.bgRect });

    // checkmark
    this.builder = new PathBuilder();
    this.builder.moveTo(3 * this.scale, this.th / 2);
    this.builder.lineTo(this.tw / 2 - 1 * this.scale, this.th - (3 * this.scale));
    this.builder.lineTo(this.tw - (3 * this.scale), 3 * this.scale);
    this.mark = new Path();
    this.mark.path = this.builder.build();
    this.mark.setColor("transparent");
    this.mark.setStroke({
      stroke: "#747474",
      width: 2
    });
    this.mark.container.style.display = (checked) ? "block" : "none";
    this.elements.push({ element: this.mark });

    // "clickability":
    this.container.addEventListener("pointerdown", () => { // include touch and mouse clicks
      this.toggle(this.clickCallback);
    });

    return this;
  }
  toggle(cb) {
    this.toggled = 1 - this.toggled;
    this.checked = (this.toggled) ? true : false;
    this.mark.container.style.display = (this.toggled) ? "block" : "none";
    cb(this.toggled); // call the callback function with the current state
  }
  check() {
    this.mark.container.style.display = "block";
    this.checked = true;
  }
  uncheck() {
    this.mark.container.style.display = "none";
    this.checked = false;
  }
  setScale(s) {
    this.scale = s;
    this.updateAttributes();
  }
  updateAttributes() {
    super.updateAttributes();
    if (!this.builder) return; // happens when the super constructor is called
    this.builder.clear();
    this.builder.moveTo(3 * this.scale, this.th / 2);
    this.builder.lineTo(this.tw / 2 - 1 * this.scale, this.th - (3 * this.scale));
    this.builder.lineTo(this.tw - (3 * this.scale), 3 * this.scale);
    this.mark.path = this.builder.build();
    this.bgRect.setScale(this.scale);
  }
}
class HTMLCheckbox {
  constructor(x, y, scale) {
    this.x = x;
    this.y = y;
    this.scale = scale;

    this.container = document.createElement("input");
    this.container.type = "checkbox";
    this.container.classList.add("openvs_graphics_checkbox");
    this.container.style.position = "absolute";
    this.updateAttributes();

    this.style = document.createElement("style");
    document.head.appendChild(this.style);

    return this;
  }
  createStyleDeclaration() {
    var style = ".openvs_graphics_checkbox:checked:after {\n";
    style += "font-size: " + (14 * this.scale) + "px;\n";
    style += "left: " + (3 * this.scale) + "px;\n";
    style += "}";
    return style;
  }
  updateAttributes() {
    this.container.style.top = this.y + "px";
    this.container.style.left = this.x + "px";
    if (this.scale) {
      this.style.innerHTML = this.createStyleDeclaration();
      this.container.style.padding = (9 * this.scale) + "px";
    }
  }
  setPosition(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.updateAttributes();
  }
  setScale(s) {
    this.scale = s;
    this.updateAttributes();
  }
  createSVGElement() {
    return this.container;
  }
}
class RasterBackground {
  constructor(x, y, width, height, zoom) {
    this.colors = {
      background: "#141414",
      dot: "#1c1c1c"
    }

    // TODO: Spam dragging while slow movement bug fix!

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.zoom = zoom;
    this.interactions = new UserInteractionManager();

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "g");

    this.bg = new Rectangle(0, 0, this.width, this.height);
    this.bg.setColor(this.colors.background);

    //this.baseDist = this.width / 23;
    this.dotRad = 5 * 0.675;

    // panning support
    this.bgPos = { // pan position
      x: 0,
      y: 0
    };
    this.mouseStartPos = {
      x: 0,
      y: 0
    };
    this.dragging = false;

    return this;
  }
  attach(engine) { // called on attaching to an SVGEngine
    this.engine = engine;
  }
  pan(xDiff, yDiff, cXDiff, cYDiff) { // cDiff == the changes since the last event
    let dotDiffX = xDiff % this.distance; // the difference a single dot has to move
    let dotDiffY = yDiff % this.distance;

    this.dots.forEach((dot) => {
      dot.setPosition({ x: dot.ox + dotDiffX, y: dot.oy + dotDiffY });
    });

    if (!this.engine) return;
    this.engine.components.forEach(d => {
      let component = d.component;
      component.setPosition({ x: component.x + cXDiff, y: component.y + cYDiff });
    });
  }
  initPanning() {
    this.interactions.initListeners(this.container, (e) => {
      // mousedown
      this.dragging = true;
      this.mouseStartPos = {
        x: e.clientX,
        y: e.clientY
      };
    }, () => {}, (e) => {
      // mouseup
      this.dragging = false;
      this.mouseStartPos = { x: 0, y: 0 };
    });
    this.interactions.initListeners(window, () => {}, (e) => {
      // mousemove on windows to prevent glitching when noving mouse over other elements
      if (!this.dragging) return;
      let xDiff = e.clientX - this.mouseStartPos.x;
      let yDiff = e.clientY - this.mouseStartPos.y;
      this.bgPos.x += xDiff;
      this.bgPos.y += yDiff;
      this.pan(xDiff, yDiff, e.movementX, e.movementY);
    }, () => {})
  }
  createDots() {
    this.distance = 35; //this.baseDist * this.zoom;
    this.rad = this.dotRad * this.zoom;

    this.dots = [];
    this.columns = Math.ceil(this.width / this.distance);
    this.rows = Math.ceil(this.height / this.distance);

    for (let i = 0; i < this.columns; i++) {
      for (let j = 0; j < this.rows; j++) {
        const circle = new Circle(this.distance * (i), this.distance * (j), this.rad, false);
        circle.setColor(this.colors.dot);
        this.dots.push(circle);
      }
    }
  }
  createSVGElement() {
    this.container.innerHTML = "";
    this.createDots();
    this.initPanning();
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
    this.element.style.touchAction = "none";
    this.element.style.userSelect = "none";
    this.element.id = "ULVS-Engine_" + (new Date()).getTime();
    document.body.appendChild(this.element);

    // separated container for connector elements so they stay on top
    /*this.connectorContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.connectorContainer.id = "connectors";
    this.element.appendChild(this.connectorContainer);*/

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // setup global variables
    window.openVS = {
      nodes: {

      },
      connectors: [

      ]
    }

    this.components = [];
    this.scale = 1;

    window.uid = () => {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    this.top = SVGEngine.getAbsCoords(this.element).y;
    this.left = SVGEngine.getAbsCoords(this.element).x;

    this.connTypeToggle = 1;

    this.generateStyles();

    return this;
  }
  get renderElement() {
    return this.element;
  }
  set renderElement(i) {
    console.warn("Don't do that! [SVGEngine.renderElement is readonly] trying to set to '" + i +"'");
  }
  toggleConnectorType() {
    this.connTypeToggle = 1 - this.connTypeToggle;
    let type = (this.connTypeToggle === 1) ? "bezier" : "line";
    this.components.forEach((c) => {
      if (!c.component instanceof Node) return;
      c.component.setConnectorType(type);
    });
  }
  generateStyles() {
    this.style = document.createElement("style");

    this.style.innerHTML = "@font-face {\n";
    this.style.innerHTML += "  font-family: LibreFranklin_" + this.element.id + ";\n";
    this.style.innerHTML += "  src: url('https://carroted.github.io/ulvs-graphics/assets/LibreFranklin-VariableFont_wght.ttf');\n";
    this.style.innerHTML += "}\n";

    this.style.innerHTML += "#" + this.element.id + " * {\n";
    this.style.innerHTML += "  font-family: LibreFranklin_" + this.element.id + ";\n";
    this.style.innerHTML += "  font-size: 96%;\n";
    this.style.innerHTML += "}";

    document.head.appendChild(this.style);
  }
  static getAbsCoords(elem) {
    const box = elem.getBoundingClientRect();

    const body = document.body;
    const docEl = document.documentElement;

    const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    const clientTop = docEl.clientTop || body.clientTop || 0;
    const clientLeft = docEl.clientLeft || body.clientLeft || 0;

    const top = box.top + scrollTop - clientTop;
    const left = box.left + scrollLeft - clientLeft;

    return { x: left, y: top };
  }
  static createShadowFilter(dx=3, dy=3, x="-50%", y="-50%", deviation=3) {
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
  setBackground(bgrd) {
    bgrd.attach(this);
    this.element.appendChild(bgrd.createSVGElement());
  }
  zoomOut() {
    this.scale -= 0.2;
    this.components.forEach((c) => {
      c.component.setScale(this.scale);
    });
  }
  zoomIn() {
    this.scale += 0.2;
    this.components.forEach((c) => {
      c.component.setScale(this.scale);
    });
  }
  addComponent(c, render=(el)=>el.createSVGElement()) {
    this.components.push({ component: c, render: render});
    if (c.attachEngine) c.attachEngine(this);
    this.element.appendChild(render(c));
  }
}
class RoundedTriangle {
  constructor(borderRadius=2, width) {
    this.width = width;
    this.height = (width / 2) * Math.sqrt(3);
    this.cd = borderRadius; // corner distance, distance from the corner of the triangle where the curve starts
    this.strokeWidth = this.cd * 10;

    this.builder = new PathBuilder();
    this.builder.moveTo(this.cd / 2, this.height - this.cd / 2);
    this.builder.lineTo(this.width - this.cd / 2, this.height - this.cd / 2);
    this.builder.lineTo(this.width / 2, this.cd / 2);
    this.builder.closePath();

    this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.path.setAttribute("d", this.builder.build());
    this.path.setAttribute("stroke-width", this.strokeWidth);
    this.path.style.strokeLinejoin = "round";
  }
}
class RoundedTriangleComponent extends RoundedTriangle {
  constructor(x, y, rot, scale) {
    super(0.6, 13);
    this.x = x;
    this.y = y;
    this.rot = rot;
    this.scale = scale;
    this.isComponent = true;

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.container.style.overflow = "overlay";
    this.container.appendChild(this.path);
    this.color = "white";
    this.stroke = "white";
    this.updateAttributes();

    return this;
  }
  setOpacity(o) {
    this.opacity = 0;
    this.container.style.opacity = o;
  }
  setScale(s) {
    this.scale = s;
    this.updateAttributes();
  }
  setPosition(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.updateAttributes();
  }
  setColor(color) {
    this.color = color;
    this.updateAttributes();
  }
  setStroke(color) {
    this.stroke = color;
    this.updateAttributes();
  }
  updateAttributes() {
    const path = this.path;
    const svg = this.container;

    svg.setAttribute("x", this.x);
    svg.setAttribute("y", this.y);

    if (this.color) path.setAttribute("fill", this.color);
    if (this.stroke) path.setAttribute("stroke", this.stroke);
    if (this.rot || this.scale) path.setAttribute("transform", ((this.scale) ? "scale(" + this.scale + ") " : " ") + ((this.rot) ? "rotate(" + this.rot + "," + (this.width/2) + "," + (this.height/2) + ")" : ""));
  }
  createSVGElement() {
    return this.container;
  }
  setScale(scale) {
    this.scale = scale;
    this.updateAttributes();
  }
}

const builder = new PathBuilder();
builder.moveTo(20, 120);
builder.lineTo(120, 120);
builder.lineTo(70, 20);
builder.closePath();

const path = new Path();
path.path = builder.build();
path.setColor("white");
path.setStroke({
  stroke: "white",
  width: 10
});
path.container.style.strokeLinejoin = "round";
//engine.element.appendChild(path.container);

document.body.style.height = window.innerHeight + "px";
document.body.style.width = window.innerWidth + "px";

const engine = new SVGEngine();
const bgrd = new RasterBackground(0, 0, engine.width, engine.height, 1);
engine.setBackground(bgrd);

const rect = new Rectangle(120, 120, 50, 50, true);
rect.setColor("black");
rect.setStroke({
  color: "black",
  width: 1
});

const condition = new ConditionNode(375, 124, 1, engine, "bezier");
engine.addComponent(condition);

const condition1 = new ConditionNode(704, 125, 1, engine, "bezier");
engine.addComponent(condition1);

const device = new IsMobileNode(55, 224, 1, engine, "bezier");
engine.addComponent(device);

const addition = new AdditionNode(361, 381, 1, engine, "bezier");
engine.addComponent(addition);

const screen = new ScreenSizeNode(55, 347, 1, engine, "bezier");
engine.addComponent(screen);

const start = new StartEventNode(56, 56, 1, engine, "bezier");
engine.addComponent(start);

const math = new MathNode(100, 100, 1, engine, "bezier");
engine.addComponent(math);

document.body.style.overflow = "hidden";

window.addEventListener("mousewheel", (e) => {
  /*e.preventDefault();
  if (e.deltaY > 0) {
    // zoom out
    engine.zoomOut();
  } else {
    // zoom in
    engine.zoomIn();
  }*/
});
