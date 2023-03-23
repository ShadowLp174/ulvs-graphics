/**
 * Base class for every component
 * @class
 * @classDesc The base class for every "complex" component, doing some of the trivial work.
 */
class Component {
  /**
   * @description Initiates a new component
   *
   * @param  {number} x       X position in the parent SVG
   * @param  {number} y       Y position in the parent SVG
   * @param  {number} width   Height, for calculations
   * @param  {number} height  Width, for calculations
   * @param  {number} scale=1 The scale of the values
   * @return {Component}      The component object
   */
  constructor(x, y, width, height, scale = 1) {
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
    this.container.style.overflow = "visible";
    this.updateAttributes();

    return this;
  }
  /**
   * @description Makes the component invisible. Interactions shouldn't be possible anymore.
   *
   * @return {void}
   */
  hide() {
    this.container.style.display = "none";
  }
  /**
   * @description Reverts [hide]{@link Component#hide}
   *
   * @return {void}
   */
  show() {
    this.container.style.display = "initial";
  }

  /**
   * @description   Updates the attributes of the SVG element in the DOM
   *
   * @return {void} Void
   */
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
    this.bbox = this.container.getBBox();
    // only apply the viewBox attribute when the element is rendered
    if (this.container.parentElement) this.container.setAttribute("viewBox", "0 0 " + this.bbox.width + " " + this.bbox.height)
    this.container.setAttribute("width", this.bbox.width * this.scale);
    this.container.setAttribute("height", this.bbox.height * this.scale);
    this.container.setAttribute("preserveAspectRatio", "xMinYMin slice");

    this.container.setAttribute("x", this.x);
    this.container.setAttribute("y", this.y);
  }
  updateChildren() {
    this.elements.forEach((elem) => {
      (!elem.update) ? elem.element.update(this) : elem.update(elem.element, this);
    });
  }


  /**
   * @description      Moves the svg container to the top of the parent. The parent has to be specified earlier by setting .renderContainer to an HTML element
   *
   * @return {boolean} Wether moving could be done or not. Returns false, if renderContainer isn't set.
   */
  moveToTop() { // moves the current component to the top of the container
    if (!this.renderContainer) return false;
    if (this.renderContainer.querySelector("#connectors")) {
      // component is inside a svgengine
      const connectorGroup = this.renderContainer.querySelector("#connectors");
      this.renderContainer.insertBefore(this.container, connectorGroup);
      return true;
    } else {
      ((this.renderContainer.querySelector(".nodes")) ? this.renderContainer.querySelector(".nodes") : this.renderContainer).appendChild(this.container);
      return true;
    }
  }


  /**
   * @description Change the coordinates in the parent svg element
   *
   * @param  {object} pos   The new position object
   * @param  {number} pos.x X coordinate
   * @param  {number} pos.y Y coordinate
   * @return {object}       The new position
   */
  setPosition(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.updateAttributes();
    return pos;
  }

  /**
   * @description Puts together the HTML element with all it's sub element, ready to be added to a parent.
   *
   * @param  {HTMLElement} c=null (Optional) Equivalent to setting the .renderContainer property.
   * @return {HTMLElement}        Returns the HTML element, containing all the children.
   */
  createSVGElement(c = null) { // create the whole svg element and return it
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

  /**
   *  @typedef {Object} Position
   *  @property {number} x - The X position of the top left corner
   *  @property {number} y - The Y position of the top left corner
   */

  /**
   * @description Move the component relative to its current position.
   *
   * @param  {number} deltaX The amount of
   * @param  {number} deltaY description
   * @return {Position}        The new position
   */
  move(deltaX, deltaY) {
    if ((!deltaX && deltaX !== 0) || ((!deltaY && deltaY !== 0))) throw "Invalid parameters! [" + this.constructor.name + ".move(deltaX, deltaY)]";
    this.x += deltaX;
    this.y += deltaY;
    this.updateAttributes();
    return { x: this.x, y: this.y };
  }

  /**
   * @description Scales the component and its children.
   *
   * @deprecated Broken in many ways, use .setViewboxScale() instead.
   * @param  {number} newScale The new scale of the component
   * @return {number}          The new scale.
   */
  setComponentScale(newScale) {
    if (!newScale) throw "Scale cannot be empty! [" + this.constructor.name + ".setComponentScale()]";
    const ratio = newScale / this.scale; // how everything has to be scaled
    if (Number.isNaN(ratio)) throw "Ratio has to be a number. [" + this.constructor.name + ".setComponentScale()]";
    this.elements.forEach((e) => {
      const el = (Array.isArray(e.element)) ? e.element : [e.element];
      el.forEach(e => {
        if (e.setComponentScale) e.setComponentScale(((e.scale) ? e.scale : this.scale) * ratio);
        if (!e.move) return;
        let dX = e.x * ratio - e.x;
        let dY = e.y * ratio - e.y;
        e.move(dX, dY);
      });
    });
    this.scale = newScale;
    this.updateAttributes();
    return this.scale;
  }

  /**
   * @description Change the scale of the element using the viewBox property.
   *
   * @param  {number} newScale The new scale of the element
   * @return {void}
   */
  setViewboxScale(newScale) {
    this.scale = newScale;
    this.updateAttributes();
  }
}
class Transform {
  static vXAnchor = {
    CENTER: "Mid",
    LEFT: "Min",
    RIGHT: "Max"
  }
  static vYAnchor = {
    MIDDLE: "Mid",
    TOP: "Min",
    BOTTOM: "Max"
  }
}
/**
 * @class
 * @classdesc The viewport object is one of the basic objects beside, circle,
 * rectangle and similar. You can use this to group elements together in a new
 * viewport and new coordinates for every sub-component.
 */
class Viewport {
  /**
   * @description Initiates the Viewport object
   *
   * @param  {number} x The x position of the viewport in the parent.
   * @param  {number} y The y position of the viewport in the parent.
   * @param  {number} scale=1 This value is only used for scaling
   * @returns {Viewport}
   * @constructor
   */
  constructor(x, y, scale=1) {
    this.x = x;
    this.y = y;
    this.scale = scale;

    this.components = [];

    this.vxa = Transform.vXAnchor.LEFT;
    this.vya = Transform.vYAnchor.TOP;

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.container.style.overflow = "visible";
    this.updateAttributes();

    return this;
  }

  /**
   * @description Set the position of the viewport in the parent. This will move
   * the children as well.
   *
   * @param  {object} pos The new position of the viewport.
   * @param  {number} pos.x The new x position.
   * @param  {number} pos.y The new y position.
   * @return {void}
   */
  setPosition(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.updateAttributes();
  }
  setScale(s) {
    this.scale = s;
    this.components.forEach(c => {
      if (c.setScale) c.setScale(s);
    });
  }
  setComponentScale(newScale) {
    if (!newScale) throw "Scale cannot be empty! [" + this.constructor.name + ".setComponentScale()]";
    const ratio = newScale / this.scale; // how everything has to be scaled
    if (Number.isNaN(ratio)) throw "Ratio has to be a number. [" + this.constructor.name + ".setComponentScale()]";
    this.components.forEach((e) => {
      const el = (Array.isArray(e.element)) ? e.element : [e.element];
      el.forEach(e => {
        if (e.setComponentScale) e.setComponentScale(((e.scale) ? e.scale : this.scale) * ratio);
        if (!e.move) return;
        let dX = e.x * ratio - e.x;
        let dY = e.y * ratio - e.y;
        e.move(dX, dY);
      });
    });
    this.scale = newScale;
    this.updateAttributes();
    return this.scale;
  }
  /**
   * @description Change the scale of the element using the viewBox property.
   *
   * @param  {number} newScale The new scale of the element
   * @return {void}
   */
  setViewboxScale(newScale) {
    this.scale = newScale;
    this.updateAttributes();
  }
  /**
   * @description Move the component relative to its current position.
   *
   * @param  {number} deltaX The amount of
   * @param  {number} deltaY description
   * @return {Position}        The new position
   */
  move(deltaX, deltaY) {
    if ((!deltaX && deltaX !== 0) || ((!deltaY && deltaY !== 0))) throw "Invalid parameters! [" + this.contuctor.name + ".move(deltaX, deltaY)]";
    this.x += deltaX;
    this.y += deltaY;
    this.updateAttributes();
    return { x: this.x, y: this.y };
  }

  /**
   * @description Add a component to the viewport that will be rendered inside.
   *
   * @param {(Component|object)} c The component to add.
   * @param {function}           render=(el)=>el.createSVGElement() The function
   * that will be called to render the component. It has to return an HTMLElement
   * of any type.
   * @returns {void}
   */
  addComponent(c, render = (el) => el.createSVGElement()) {
    this.components.push({ element: c, render: render });
  }
  updateAttributes() {
    this.bbox = this.container.getBBox();
    if (this.container.parentElement) this.container.setAttribute("viewBox", "0 0 " + this.bbox.width + " " + this.bbox.height)
    this.container.setAttribute("width", this.bbox.width * this.scale);
    this.container.setAttribute("height", this.bbox.height * this.scale);
    this.container.setAttribute("preserveAspectRatio", "x" + this.vxa + "Y" + this.vya + " slice");

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
  setViewboxAnchor(vXAnchor=Transform.vXAnchor.LEFT, vYAnchor=Transform.vYAnchor.TOP) {
    this.vxa = vXAnchor;
    this.vya = vYAnchor;
    this.updateAttributes();
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
  addComponent(c, render = (el) => el.createSVGElement()) {
    this.components.push(c);
    this.container.appendChild(render(c));
  }
  createSVGElement() {
    return this.container;
  }
}
class UserInteractionManager {
  constructor() { // an instance of this is stored in the window object. See SVGEngine
    this.rclick = [];

    window.addEventListener("contextmenu", (e) => {
      let el = document.elementFromPoint(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset);
      let cancel = false;
      this.rclick.filter(o => o.el == el || o.el == "global").forEach(o => {
        if (o.listener) o.listener(e);
        cancel = o.cctx || cancel;
      });
      if (cancel) e.preventDefault(); // cancel context menu
      if (cancel) return false; // browsers are weird
    });

    return this;
  }
  cancelCtxMenu(el) {
    this.rclick.push({ el, listener: null, cctx: true });
  }
  rightClickListener(el, l, cancelCtxMenu=false) {
    this.rclick.push({ el, listener: l, cctx: cancelCtxMenu });
  }
  initListeners(el, onStart, onMove, onEnd, rcl=false, maxTouches=Number.POSITIVE_INFINITY, reuseTouches=false) { // TODO: fix bugs appearing when using more than one finger
    // mouse listeners
    var isRightClick = (e) => {
      e = e || window.event;
      return (e.which == 3) || (e.button == 2);
      /*if ("which" in e) { // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
        return e.which == 3;
      } else if ("button" in e) { // IE, Opera
        return e.button == 2;
      }*/
    }
    el.addEventListener("mousedown", function(e) {
      if (!rcl) {return onStart.call(this, e);}
      if (isRightClick(e)) onStart.call(this, e);
    });
    el.addEventListener("mousemove", function(e) {
      if (!rcl) return onMove.call(this, e);
      if (isRightClick(e)) onStart.call(this, e);
    });
    el.addEventListener("mouseup", function(e) {
      if (!rcl) return onEnd.call(this, e);
      if (isRightClick(e)) onEnd.call(this, e);
    });

    //if (rcl) return; // no right click on touch

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

/**
 * @class
 * @classdesc The component creating the output dots, that can be used to connect to input sockets.
 * @augments  Component
 */

/**
 * The type used for OutputPlugComponents
 * @typedef {(
 *  OutputPlugComponent.Type.BOOLEAN |
 *  OutputPlugComponent.Type.INTEGER |
 *  OutputPlugComponent.Type.STRING |
 *  OutputPlugComponent.Type.CONNECTOR |
 *  OutputPlugComponent.Type.ANY
 *  )} OutputPlugComponentType
 */
class OutputPlugComponent extends Component {

  /**
   * Enum for Plug types; (BOOLEAN|NUMBER|INTEGER|CONNECTOR|ANY)
   * @enum {string}
   * @constant
   */
  static Type = {
    BOOLEAN: "bool",
    NUMBER: "num",
    INTEGER: "int",
    CONNECTOR: "connect",
    ANY: "any",
    FLOAT: "float",
    ARRAY: "arr",
    STRING: "str"
  }
  static ColorMapping = {
    bool: "#a44747",
    connect: "#ffffff",
    num: "#427fbd",
    int: "#427fbd",
    str: "#daa520",
    any: "transparent"
  }
  static TypeLabel = {
    bool: "BOOL",
    num: "NUM",
    int: "INT",
    str: "STR",
    any: ""
  }
  static ConnectorColor = {
    bool: "#a44747",
    connect: "#808080",
    num: "#427fbd",
    int: "#427fbd",
    str: "#daa520",
    any: ""
  }

  /**
   * @description Initiate the OututPlugComponent object.
   *
   * @constructs
   * @see    {@link Component.constructor}  For the base parameters (x, y, ...)
   * @param  {OutputPlugComponentType} type The type of the plug. All of the outgoing connectors will only connect to compatible sockets. Also changes in design. See OutputPlugComponent.Type for the types.
   * @param  {object} engine                The SVGEngine object that contains this plug.
   * @param  {object} node                  The object type of Node, this plug is attached to.
   * @param  {string} styleType=""          The style of the Connector. See the Connector class for more details.
   * @param  {string} label=""              The label of the plug.
   * @return {object}                       The OutputPlugComponent object.
   */
  constructor(x, y, width, height, scale, type, engine, node, styleType = "", label = "") {
    super(x, y, width, height, scale);

    this.styleType = styleType; // the style of the connector like Bezier, or Line
    this.type = type; // the type of the plug
    this.node = node; // the node the plug is attached to
    this.connected = false;
    this.interactions = window.userInteractionManager; // user interactions
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

    this.oCircle = new Circle(20 * this.scale, 0, 8 * this.scale, true, this.scale); // the white circle
    this.oCircle.setColor(this.color);
    this.initConnector();
    this.elements.push({ element: this.oCircle, render: (el) => el.createSVGElement() });

    this.eventElem = document.createElement("span");

    if (type !== OutputPlugComponent.Type.CONNECTOR) {
      this.initType();
      return this;
    }

    this.oT = new RoundedTriangleComponent(0, 2.5 * this.scale, 90, 1 * this.scale); // the white triangle
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

  /**
   * @description Change the type of the plug after initialization
   *
   * @param  {OutputPlugComponentType} type Type to set the plug to.
   * @return {void}
   */
  setType(type) {
    this.type = type;
    this.color = OutputPlugComponent.ColorMapping[this.type];
    this.typeLabel.setColor(this.color);
    this.typeLabel.setText(OutputPlugComponent.TypeLabel[this.type]);
    this.oCircle.setColor(this.color);
  }

  /**
   * @description Set the opacity of this plug (every child element included).
   *
   * @param  {(string|float|number)} o The CSS opacity
   * @return {void}
   */
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

  /**
   * @description Get the distance between two points in a 2D system.
   *
   * @param  {number} x  X coordinate of the first point
   * @param  {number} y  Y coordinate of the first point
   * @param  {number} x1 X coordinate of the second point
   * @param  {number} y1 Y coordinate of the second point
   * @return {number}    The distance between the two points
   */
  distance(x, y, x1, y1) { // get the distance between two points x,y and x1,y1
    return Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
  }

  /**
   * @description Set the type of newly created connectors
   *
   * @param  {string} type The connector type. See the connector class for possible options.
   * @return {void}
   */
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

  /**
   * @description Creates a collection of suitable sockets for connector
   * connections by searching recursively through the elements inside the parent
   * SVG engine object declared on initialization.
   *
   * @return {Array.<InputSocketComponent>} The collected sockets.
   */
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

  /**
   * @description Set the colour of the parts creating the connector,
   * like the triangle and the dot.
   *
   * @param  {string} c The CSS colour you want to switch to.
   * @return {void}
   */
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
  connectTo(socket) {
    this.createConnector({ clientX: socket.x, clientY: socket.y });
    this.snappingSocket = { socket: socket };
    this.snap();
  }
  snap() {
    const socket = this.snappingSocket.socket;
    let p = this.getAbsCoords(socket.cCircle.container);
    this.activeConnector.moveTo({
      x: p.x + socket.cCircle.radius * socket.scale,
      y: p.y + socket.cCircle.radius * socket.scale
    });
    this.activeConnector.connectedTo = this.snappingSocket.socket;
    this.activeConnector.connectedNode = this.snappingSocket.socket.node.id;
    socket.connected = true;
    socket.connector = this.activeConnector;
    const connector = this.activeConnector;
    connector.setMoveListener(socket.node.addEventListener("move", (_e) => {
      if (this.connected.length == 0 || !this.connected) return; // only execute if the node is currently connected
      const pos = this.getAbsCoords(socket.cCircle.container);
      pos.x += socket.cCircle.radius * socket.scale;
      pos.y += socket.cCircle.radius * socket.scale;
      connector.moveTo(pos);
    }), socket.node);
    socket.connect(this.activeConnector);
    this.connected.push(this.activeConnector);
    socket.cCircle.setRadius(8 * socket.scale); // reset socket proportions
    this.dragging = false;
  }
  createConnector(e) {
    this.activeConnector = new (ConnectorManager.getConnector(this.styleType))(this, { x: e.clientX, y: e.clientY }, this.getAbsCoords(this.oCircle.container), this.scale, OutputPlugComponent.ConnectorColor[this.type]);
    this.parentSVGEngine.element.appendChild(this.activeConnector.createSVGElement()); // don't add as a component to prevent "wobbing" while panning
    this.emit("connector", this.activeConnector);
  }
  initConnector() {
    this.dragging = false;
    this.snapping = false;
    this.mouseDown = (e) => {
      this.dragging = true;
      this.initSnapping();
      this.createConnector(e);
    }
    this.interactions.initListeners(this.oCircle.container, (e) => {
      if (this.type == OutputPlugComponent.Type.ANY) return;
      this.mouseDown(e);
    }, () => { }, () => { });
    this.node.addEventListener("move", () => {
      if (!this.activeConnector || !this.connected) return; // only execute if there is a connected connector
      const pos = this.getAbsCoords(this.oCircle.container);
      pos.x += this.oCircle.radius * this.scale;
      pos.y += this.oCircle.radius * this.scale;
      this.connected.forEach(c => {
        c.moveStartTo(pos);
      });
    });
    this.interactions.initListeners(window, () => { }, (e) => {
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
        s.cCircle.setRadius(s.defRadius * s.scale);
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

/**
 * The type used for InputSocketComponents
 * @typedef {string} InputSocketComponentType
 * @property {string} BOOLEAN
 * @property {string} INTEGER
 * @property {string} FLOAT
 * @property {string} STRING
 * @property {string} CONNECTOR
 * @property {string} ANY
 */
/**
 * Creates a new InputSocketComponent
 * @class
 * @classdesc The object for ingoing plug connections. On nodes
 * @augments Component
 */
class InputSocketComponent extends Component {

  /**
   * @enum
   * @description Valid types used for InputSocketComponents
   */
  static Type = {
    BOOLEAN: "bool",
    CONNECTOR: "connect",
    NUMBER: "num",
    INTEGER: "int",
    FLOAT: "float",
    ANY: "any",
    ARRAY: "arr",
    STRING: "str"
  }
  static ColorMapping = {
    bool: "#a44747",
    connect: "#ffffff",
    num: "#427fbd",
    int: "#427fbd",
    any: "#ffffff",
    str: "#779457",
    str: "#daa520"
  }
  static StrokeMapping = {
    bool: { stroke: "transparent", width: 1 },
    connect: { stroke: "transparent", width: 1 },
    int: { stroke: "transparent", width: 1 },
    num: { stroke: "transparent", width: 1 },
    any: { stroke: "#ffffff", width: 1 },
    str: { stroke: "transparent", width: 1 }
  }
  static TypeLabel = {
    bool: "BOOL",
    num: "NUM",
    int: "INT",
    any: "ANY",
    str: "STR"
  }
  /**
   * @description Initiates a new inputSocketComponent
   *
   * @param  {Number} x             x position in the parent svg
   * @param  {Number} y             y position in the parent svg
   * @param  {Number} width         the width of he inputsocket
   * @param  {Number} height        the height
   * @param  {Number} scale         the scale, set to 1 to ignore
   * @param  {String} type          type of the socket, see InputSocketComponent.Type for types
   * @param  {Node} node            parent node object, the socket is attached to
   * @param  {String} label         the label of the socket
   * @param  {Boolean} userInput=true Wether or not to include some kind of input component for the user to enter a value
   */
  constructor(x, y, width, height, scale, type, node, label, userInput = true) {
    super(x, y, width, height, scale);

    this.type = type; // TODO: the type of the socket
    this.node = node; // the node the socket is attached to
    this.label = label;
    this.id = uid();
    this.uInput = (InputSocketComponent.Type.ANY !== type) ? userInput : false;

    this.container.setAttribute("OpenVS-Node-Id", this.node.id);

    this.color = InputSocketComponent.ColorMapping[type];

    this.cCircle = new Circle(0, 0, 8 * this.scale, true, this.scale);
    this.cCircle.setColor(this.color);
    this.elements.push({ element: this.cCircle, render: (el) => el.createSVGElement() });
    this.defRadius = 8 * this.scale; // the default radius, used for connectors

    this.con; // the connector
    this.conCallback = null, this.deconCallback = null;
    this.changeCBs = [];
    this.dataConstant = true;
    this.storedData = null; // initiated on initType
    this.phantomTypes = []; // only important if type ANY; see Connector.typesCompatible

    if (type !== InputSocketComponent.Type.CONNECTOR) {
      this.initType();
      return this;
    }

    // only draw this when creating a connection connector
    this.cT = new RoundedTriangleComponent(22 * this.scale, 2.5 * this.scale, 90, 1 * this.scale);
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

  /**
   * @description Specify the function to execute when a connector gets attached.
   *
   * @param  {function} cb The callback. The function receives the connector that has been connected as argument.
   * @return {void}
   */
  setConnectionCallback(cb) {
    this.conCallback = cb;
  }
  /**
   * @description Specify the function to execute when a connector gets detached.
   *
   * @param  {function} cb The callback. The function receives the connector that has been deconnected as argument.
   * @return {void}
   */
  setDisconnectionCallback(cb) {
    this.deconCallback = cb;
  }

  /**
   * @description Add a listener to the onValueChange event
   *
   * @param  {function} cb The callback. The passed parameter contains a .prevent() method that cancel the event like the .preventDefault method
   * @return {void}
   */
  onValueChange(cb) {
    this.changeCBs.push(cb);
  }

  /**
   * @description Callback function for Connectors. This function gets called as soon as a connector connects.
   *
   * @param  {Connector} connector The connector that connected
   * @return {void}
   */
  connect(connector) {
    if (this.conCallback) this.conCallback(connector);
    if (!this.uInput) return;
    if (!this.box) return;
    if (this.type == InputSocketComponent.Type.BOOLEAN) {
      this.node.reset();
    }
    this.dataConstant = false;
    this.box.container.style.display = "none";
    this.offset = 0;
    this.relocateLabels();
  }
  /**
   * @description Callback function for Connectors. This function gets called as soon as a connector disconnects.
   *
   * @param  {Connector} connector The connector that disconnected
   * @return {void}
   */
  disconnect(connector) {
    if (this.deconCallback) this.deconCallback(connector);
    if (!this.uInput) return;
    if (!this.box) return;
    if (this.type == InputSocketComponent.Type.BOOLEAN) {
      if (this.node.state) this.node.simulate(this.node.state);
    }
    this.dataConstant = true;
    this.box.container.style.display = "block";
    this.offset = this.box.tw + 4;
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
      x: (this.offset - 21 + metrics.width + typeMetrics.width) * this.scale,
      y: (typeMetrics.height + 2) * this.scale
    });
  }
  getUserInputComponent() {
    switch (this.type) {
      case InputSocketComponent.Type.STRING:
      case InputSocketComponent.Type.NUMBER:
      case InputSocketComponent.Type.INT:
        return new SVGInput(21 * this.scale, 0, 50, 1, (data) => {
          // TODO: implement e.prevent() method
          this.changeCBs.forEach(cb => {
            cb.call(this, {prevent: () => {}, oldValue: this.storedData, newValue: data});
          });
          this.storedData = data;
        });
      case InputSocketComponent.Type.BOOLEAN:
        return new SVGCheckbox(21 * this.scale, 0, this.scale, false, (state) => {
          this.storedData = state;
          if (this.node.simulate) this.node.simulate(state); // change the opacity of the plugs
        });
      default:
        console.warn("Something went wrong!", this);
        return null;
    }
  }
  initType() {
    this.offset = 0;
    if (this.uInput) {
      this.dataConstant = true;
      this.box = this.getUserInputComponent();
      this.elements.push({ element: this.box });
      this.offset = this.box.tw + 4;
    }

    let metrics = Text.measureText(this.label);
    this.metrics = metrics;
    this.text = new Text((21 + this.offset) * this.scale, (3) * this.scale, this.label, this.scale, Text.Anchor.START, Text.VerticalAnchor.TOP);
    this.text.setColor("white");
    this.elements.push({ element: this.text, render: (el) => el.createSVGElement() });

    let typeMetrics = Text.measureText(InputSocketComponent.TypeLabel[this.type], (9 * this.scale) + "px");
    this.typeMetrics = typeMetrics;
    this.typeLabel = new Text((this.offset + 23 + metrics.width) * this.scale, (2) * this.scale, InputSocketComponent.TypeLabel[this.type], this.scale, Text.Anchor.START, Text.VerticalAnchor.TOP);
    this.typeLabel.container.style.fontSize = (9 * this.scale) + "px";
    this.typeLabel.setColor(this.color);
    this.elements.push({ element: this.typeLabel, render: (el) => el.createSVGElement() });

    this.modify(true);
  }
  modify(isInit = false) {
    switch (this.type) {
      case InputSocketComponent.Type.ANY:
        this.cCircle.setColor("transparent");
        this.cCircle.setStroke(InputSocketComponent.StrokeMapping[this.type]);
        if (isInit) this.defRadius *= 0.7;
        this.cCircle.setRadius(this.cCircle.radius * 0.7, false);
        break;
      default:

        break;
    }
  }

  /**
   * @description Changes the data type of this socket after initialization.
   *
   * @param  {InputSocketComponentType} type The new data type.
   * @return {void}
   */
  setType(type) {
    this.type = type;
    this.color = InputSocketComponent.ColorMapping[this.type];
    this.cCircle.setStroke(InputSocketComponent.StrokeMapping[this.type]);
    this.cCircle.setColor(this.color);
    this.defRadius = 8 * this.scale;
    this.typeLabel.setColor(this.color);
    this.typeLabel.setText(InputSocketComponent.TypeLabel[this.type]);
    this.modify(true);
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
  resetPhantoms() {
    let removed = this.phantomTypes.length;
    this.phantomTypes.length = 0;
    return removed;
  }
  addPhantom(...types) {
    this.phantomTypes.push(...types);
    return this.phantomTypes;
  }
}

/**
 * @class
 * @classdesc The base Node class. Every complex node should extend this.
 * @augments Component
 */
class Node extends Component {
  static ClassColor = {
    basic: "#8a5794",
    event: "#779457",
    deviceinfo: "#946148",
    console: "#588068"
  };
  /**
   * @enum
   * @typedef {(string)} NodeClass
   * @description Accepted Node categories.
   */
  static Class = {
    BASIC: "basic",
    EVENT: "event",
    DEVICEINFO: "deviceinfo",
    CONSOLE: "console"
  }
  static ClassName = {
    basic: "Basic",
    event: "Event",
    deviceinfo: "Device Info",
    console: "Console"
  }

  /**
   * @description Initiates a new Node object
   *
   * @param  {number} x         The x position in the current viewport or container.
   * @param  {number} y         The y position in the current viewport or container.
   * @param  {number} scale     The scale of the Node.
   * @param  {object} svgEngine The SVGEngine object, the node is added to.
   * @return {Node}           The new Node object.
   */
  constructor(x, y, scale, svgEngine) {
    let height = 37.5 * scale;
    let width = 200 * scale;
    super(x, y, width, height, scale);

    this.colors = {
      background: "#1d1d1d",
      header: "#8a5794"
    }

    this.id = uid();
    this.nodeIdentifier = "nil";
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

    this.hRect = new Rectangle(0, 0, this.tw, 33 * this.scale, false, 5);
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
    this.connectors.addComponent(this.sockets, (el) => { return el.map(e => e.createSVGElement()); });
    this.connectors.addComponent(this.labels, (el) => { return el.map(e => e.createSVGElement()); });
    this.connectors.addComponent(this.plugs, (el) => { return el.map(e => e.createSVGElement()); });
    this.body.addComponent(this.inputSockets, (el) => { return el.map(e => e.createSVGElement()); });
    this.body.addComponent(this.outputPlugs, (el) => { return el.map(e => e.createSVGElement()); });
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
      move: new CustomEvent("move", { detail: { node: this } })
    }

    this.renderContainer = this.parentSVGEngine.element;

    return this;
  }

  destroy() {
    this.container.remove();
    delete window.openVS.nodes[this.id];
  }

  /**
   * @description Returns an up-to-date copy of the container of the current parent SVG engine.
   * @type {HTMLElement}
   */
  get renderContainer() {
    // getter to keep return an up-to-date copy of the element by the svg engine, even if it changes
    return this.parentSVGEngine.renderElement;
  }
  set renderContainer(_i) {
    // console.warn("Don't do that! [Node.renderContainer is readonly] trying to set to '" + i +"'");
  }

  /**
   * @description Returns the identifier of the node that's also passed to the program
   * spec.
   *
   * @return {string}  The node identifier string.
   */
  get identifier() {
    return this.nodeIdentifier;
  }
  set identifier(_id) {
    console.warn("Please use Node.setId() instead of the setter.");
  }

  /**
   * @description Disconnects all incoming or outgoing connectors.
   *
   * @return {void}
   */
  clearConnections() {
    [...this.inputSockets, ...this.sockets].forEach(socket => {
      if (!socket.connected) return;
      socket.connector.disconnect();
    });
    [...this.outputPlugs, ...this.plugs].forEach(plug => {
      plug.connected.forEach(connector => {
        connector.disconnect();
      })
    })
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
  createPreview(x=0, y=0) {
    return new NodePreview(x, y, this.scale, this);
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

  /**
   * @callback Node~EventCallback
   * @param {object} event        The event object.
   * @param {object} event.detail The data that is delivered if it is a custom event, like the "move" event.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Event} for
   * further information about the events structure. In case of a custom event
   * like "move" see {@link https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent}
   */
  /**
   * @description Add an event listener to the node.
   *
   * @param  {("move")} event The event that should be listened for.
   * @param  {Node~EventCallback} cb The callback function.
   * @return {object}                The event listener.
   */
  addEventListener(event, cb) {
    return (this.embedNode.eventElem || this.eventElem).addEventListener(event, cb);
  }

  /**
   * @description Remove a given listener from the node.
   *
   * @param  {(string|"move")} event  The event of the listener that should be removed
   * @param  {object} listener The listener (returned by {@link Node#addEventListener})
   * @param  {...object} opts  Other options you might want to pass to the eventTarget; see {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#parameters}
   * @return {void}
   */
  removeEventListener(event, listener, ...opts) {
    return (this.embedNode.eventElem || this.eventElem).removeEventListener(event, listener, ...opts);
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
        y: (this.th * 0.2) + 25 * this.scale + (36 * i) * this.scale
      })
      plug.setScale(this.scale);
    });
  }
  setScale(s) {
    this.scale = s;
    super.updateAttributes();
    this.setSubComponentAttributes();
  }

  /**
   * @description Attach an attachment to the node object.
   *
   * @param  {Attachment} at The attachment that should be attached.
   * @return {void}
   */
  addAttachment(at) { // attachments like the move listener
    this.attachments.push(at);
    at.attach(this);
  }

  /**
   * @description Change the name of the node after initialization.
   *
   * @param  {string} name The new name
   * @return {Text#setText}
   */
  setName(name) {
    this.name = name;
    if (!this.nText) {
      this.nText = new Text(5 * this.scale, 10 * this.scale, name, this.scale, Text.Anchor.START, Text.VerticalAnchor.TOP);
      this.nText.setColor("white");
      this.elements.push({ element: this.nText, render: (el) => el.createSVGElement() });
      return;
    }
    return this.nText.setText(name);
  }

  /**
   * @description Set the nodeIdentifier of this node. This id will be provided
   * in the program spec on program generation for the compiler.
   *
   * @param  {string} id The new id of the Node.
   * @return {void}
   */
  setId(id) {
    this.nodeIdentifier = id;
  }

  /**
   * @description Change the class after initialization.
   *
   * @param  {NodeClass} c The new class
   * @return {void}
   */
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
    this.bgRect.setHeight(this.bgRect.height + delta);
  }
  /**
   * @description Add a new program flow socket. Flow sockets/plugs are used to
   * tell ULVS which nodes run when. The flow starts at a start node and then follows
   * all connected flow connectors from node to node, resulting in a program order.
   *
   * @return {array} An array containing all of the current flow sockets.
   */
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
  /**
   * @description Add a flow plug. Flow plugs can be used to create flow connections
   * to flow sockets.
   * @see See {@link Node#addSocket} for more info about the program flow.
   *
   * @param  {string} label A label that will be displayed left to the plug.
   * @param  {("bezier"|"line")} style The style of the connector starting from this plug.
   * @return {array}       Returns an array of all the attached plugs.
   */
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
  /**
   * @description Adds an InputSocket. These sockets can be used for data transfer.
   * They are also typed and there are strict rules for which connector type can
   * connect to which socket type.
   *
   * @param  {InputSocketComponentType} type  The type of the socket.
   * @param  {string} label A label for the socket that will be displayed right to it.
   * @return {InputSocketComponent} The initiated input socket.
   */
  addInputSocket(type, label) {
    const socket = new InputSocketComponent((-8 * this.scale), (28 * this.inputSockets.length) * this.scale, 16 * this.scale, 34 * this.scale, this.scale, type, (this.embedNode || this), label);

    const currLength = Math.max(this.inputSockets.length, this.outputPlugs.length);
    this.inputSockets.push(socket);

    if (this.inputSockets.length > currLength) {
      let diff = this.inputSockets.length - currLength;
      this.bgRect.setHeight(this.bgRect.height + (28 * diff) * this.scale);
    }

    return socket;
  }
  /**
   * @description Adds an OutputPlug to the node. These are used to create data
   * connectors.
   * @see See {@link Node#addInputSocket} for more details on data connections.
   *
   * @param  {OutputPlugComponentType} type The type of the plug
   * @param  {string} label The label of the plug that will be displayed left to it.
   * @param  {("bezier"|"line")} style The style of the connector.
   * @return {OutputPlugComponent}       The initiated plug object
   */
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
    return plug;
  }


  /**
   * @description Add a user input to the body of the node. The user can enter
   * values that will be used in the compiling process as constants. Temporary deprecated
   * @deprecated Temporary deprecated as user inputs are included in input sockets
   * @param  {InputSocketComponentType} type     The data type of the input.
   * @param  {string} label="" The label of thé input that will be displayed next to it.
   * @return {object}          The input object depending on the data type.
   */
  addUserInput(type, label = "") {
    const object = new ({
      [InputSocketComponent.Type.STRING]: SVGInput
    }[type])((10 * this.scale), (28 * this.inputSockets.length) * this.scale, 64 * this.scale, 1, label);
    object.dataConstant = true; // mark for compiler
    const currLength = Math.max(this.inputSockets.length, this.outputPlugs.length);
    this.inputSockets.push(object);

    if (this.inputSockets.length > currLength) {
      let diff = this.inputSockets.length - currLength;
      this.bgRect.setHeight(this.bgRect.height + (28 * diff) * this.scale);
    }

    return object;
  }
}
class NodePreview extends Component {
  constructor(x, y, scale, node) {
    const measures = {
      header: {
        height: 28 / 4,
        radius: 2
      },
      background: {
        width: 200 / 4,
        height: 76 / 4,
        radius: 2
      }
    }
    let height = measures.background.height * scale;
    let width = measures.background.width * scale;
    super(x, y, width, height, scale);

    this.colors = {
      background: "#1d1d1d",
      header: "#8a5794"
    }

    this.node = node;
    this.class = node.class;

    this.bgRect = new Rectangle(0, 1, this.tw, this.th, true, measures.background.radius);
    this.bgRect.setColor(this.colors.background);
    this.bgRect.setStroke({
      color: "black",
      width: 0.5
    });
    this.elements.push({ element: this.bgRect });

    this.hRect = new Rectangle(0, 0, this.tw, measures.header.height * this.scale, false, measures.header.radius);
    this.hRect.setColor(Node.ClassColor[this.class]);
    this.hRect.setStroke({
      color: Node.ClassColor[this.class],
      width: 0.5
    });
    this.clip = this.hRect.createClipPath(0);
    this.hRect.setClipPath(this.clip.id);
    this.elements.push({ element: this.clip, render: (el) => el.element });
    this.elements.push({ element: this.hRect });

    this.body = new Viewport(0, measures.header.height + 6);
    this.elements.push({ element: this.body });

    console.log(node.plugs, node.sockets, node.inputSockets, node.outputPlugs);

    const spacing = 8;

    node.sockets.forEach((_socket, i) => {
      let indicator = new Circle(0, spacing * i, 2.5, false, this.scale);
      indicator.setColor("white");
      this.body.addComponent(indicator);
    });
    node.inputSockets.forEach((socket, i) => {
      let offset = Math.max(spacing * node.sockets.length, spacing * node.plugs.length) - 3.5; // remove 3.5 pixels as there too much spacing
      let indicator = new Rectangle(-2.75, offset + 4.5 * i, 5.5 * this.scale, 3, true, 2);
      indicator.setColor(InputSocketComponent.ColorMapping[socket.type])
      this.body.addComponent(indicator);
    });

    node.plugs.forEach((_plug, i) => {
      let indicator = new Circle(measures.background.width, spacing * i, 2.5, false, this.scale);
      indicator.setColor("white");
      this.body.addComponent(indicator);
    });
    node.outputPlugs.forEach((plug, i) => {
      let offset = Math.max(spacing * node.sockets.length, spacing * node.plugs.length) - 3.5; // remove 3.5 pixels as there too much spacing
      let indicator = new Rectangle(-2.75 + measures.background.width, offset + 4.5 * i, 5.5 * this.scale, 3, true, 2);
      indicator.setColor(OutputPlugComponent.ColorMapping[plug.type])
      this.body.addComponent(indicator);
    });

    let offset = measures.header.height + 3.5;
    let flowOff = Math.max(offset + node.sockets.length * spacing, offset + node.plugs.length * spacing); // offset caused by flow sockets/inputs
    console.log(flowOff);

    let sockets = flowOff + node.inputSockets.length * 4.5; // add a bit of spacing
    let plugs = flowOff + node.outputPlugs.length * 4.5;
    let corrected = Math.max(sockets, plugs, measures.background.height) + 2.5;
    console.log(measures, plugs, sockets);
    this.bgRect.setHeight(corrected);

    return this;
  }
}
class MenuItem extends Component {
  ht = "";
  title = "";
  callback = () => {};

  constructor() {
    super(0, 0, 143, 20, 1);

    return this;
  }
  setTitle(t) {
    this.title = t;
    return this;
  }
  setHoverTitle(t) {
    this.ht = t;
    return this;
  }
  setCallback(cb) {
    this.callback = cb;
    return this;
  }
}
class ContextMenu extends Component {
  constructor() {
    super(0, 0, 143, 20, 1);

    this.hide(); // only reveal when right-clicking

    this.items = [];
    this.body = new ScrollComponent(0, 0, this.width * 5, this.height, this.scale);

    return this;
  }
  addItem(i) {
    this.items.push(i);
    this.body.addComponent(i);
  }
}
class ConditionNode extends Node {
  constructor(x, y, scale, svgEngine, type = "") {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-Basic-Condition");
    this.setName("If");
    this.setClass(Node.Class.BASIC);

    this.addSocket(); // connector in/out-puts
    this.addPlug("Met", type); // if block
    this.addPlug("Not met", type); // else block
    // data inputs
    this.addInputSocket(InputSocketComponent.Type.BOOLEAN, "Condition", type);

    this.forceBranch = true;

    this.state = null;

    return this;
  }
  simulate(state) {
    this.state = state;
    this.labels[1 - state].setColor("white");
    this.labels[state].setColor("rgba(255, 255, 255, 0.3)");
    this.plugs[1 - state].setOpacity(1);
    this.plugs[state].setOpacity(0.3);
  }
  reset() {
    this.labels[0].setColor("white");
    this.labels[1].setColor("white");
    this.plugs[0].setOpacity(1);
    this.plugs[1].setOpacity(1);
  }
}
class VariableWriteNode extends Node {
  constructor(x, y, scale, svgEngine, type="") {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-Variable-Write");
    this.setName("Write Variable");
    this.setClass(Node.Class.BASIC);

    this.addSocket();
    this.addPlug("", type);

    const name = this.addInputSocket(InputSocketComponent.Type.STRING, "Name");
    name.setConnectionCallback((e) => {
    });
    this.addInputSocket(InputSocketComponent.Type.STRING, "Value");
  }
}
class VariableReadNode extends Node { // TODO: implement type selection
  constructor(x, y, scale, svgEngine, type="") {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-Variable-Read");
    this.setName("Read Variable");
    this.setClass(Node.Class.BASIC);

    const name = this.addInputSocket(InputSocketComponent.Type.STRING, "Name");
    name.onValueChange((e) => {
      const input = svgEngine.getVariable(e.value);
      this.value.setType(input.type || OutputPlugComponent.Type.ANY);
    });
    this.value = this.addOutputPlug(OutputPlugComponent.Type.ANY, "Value", type); // TODO: implement variable registry registry
  }
}
// TODO: Group nodes inside their classes
class ConsoleLogNode extends Node {
  constructor(x, y, scale, svgEngine, type = "") {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-Console-Log");
    this.setName("Log");
    this.setClass(Node.Class.CONSOLE);

    this.addSocket();
    this.addPlug("", type);

    this.addInputSocket(InputSocketComponent.Type.ANY, "Object");

    return this;
  }
}
class NodeClass {
  constructor() {
    this.nodes = [];

    return this;
  }

  addNode(id, name, c, custom = () => { }) {
    nodes.push({
      id: id,
      name: name,
      class: c,
      custom: custom
    });
  }

  // TODO: Finish
}
class IsMobileNode extends Node {
  constructor(x, y, scale, svgEngine, type = "") {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-DInfo-Mobile");
    this.setName("Is Mobile");
    this.setClass(Node.Class.DEVICEINFO);

    this.addOutputPlug(OutputPlugComponent.Type.BOOLEAN, "Is Mobile", type);

    return this;
  }
}
class ScreenSizeNode extends Node {
  constructor(x, y, scale, svgEngine, type = "") {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-DInfo-SSize");
    this.setName("Screen Size");
    this.setClass(Node.Class.DEVICEINFO);

    this.addOutputPlug(OutputPlugComponent.Type.INTEGER, "Pixels X", type);
    this.addOutputPlug(OutputPlugComponent.Type.INTEGER, "Pixels Y", type);

    return this;
  }
}
class AdditionNode extends Node {
  constructor(x, y, scale, svgEngine, type = "", embed = null, embedNode = null) {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-Basic-Add");
    this.setName("Add (Math)");
    this.setClass(Node.Class.BASIC);

    if (embed) this.embedBody(embed, embedNode);

    this.addInputSocket(InputSocketComponent.Type.NUMBER, "A", type);
    this.addInputSocket(InputSocketComponent.Type.NUMBER, "B", type);

    this.addOutputPlug(OutputPlugComponent.Type.NUMBER, "Result", type);

    return this;
  }
}
class GeneralAdditionNode extends Node {
  constructor(x, y, scale, svgEngine, type = "", embed = null, embedNode = null) {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-Baisc-GAdd");
    this.setName("Add");
    this.setClass(Node.Class.BASIC);

    if (embed) this.embedBody(embed, embedNode);

    this.a = this.addInputSocket(InputSocketComponent.Type.ANY, "A", type)
    this.a.setConnectionCallback((connector) => {
      this.a.setType(connector.plug.type);
      this.updatePlug();
      /*this.b.resetPhantoms();
      this.b.addPhantom(...this.typeLogic(connector.plug.type));*/
    });
    this.a.setDisconnectionCallback((_c) => {
      this.a.setType(InputSocketComponent.Type.ANY);
      this.updatePlug();
    })
    this.b = this.addInputSocket(InputSocketComponent.Type.ANY, "B", type)
    this.b.setConnectionCallback((connector) => {
      this.b.setType(connector.plug.type);
      this.updatePlug();
    });
    this.b.setDisconnectionCallback((_c) => {
      this.b.setType(InputSocketComponent.Type.ANY);
      this.updatePlug();
    })

    this.plug = this.addOutputPlug(OutputPlugComponent.Type.ANY, "Result", type);

    return this;
  }
  updatePlug() {
    console.log(this.a.type, this.b.type);
    this.plug.setType(this.resultType(this.a.type, this.b.type));
  }
  resultType(...types) {
    const map = {
      [OutputPlugComponent.Type.BOOLEAN]: -2,
      [OutputPlugComponent.Type.INTEGER]: -1,
      [OutputPlugComponent.Type.FLOAT]: 0,
      [OutputPlugComponent.Type.NUMBER]: 1,
      [OutputPlugComponent.Type.STRING]: 2,
      [OutputPlugComponent.Type.ARRAY]: 3,
      [OutputPlugComponent.Type.ANY]: 4,
    }
    let highest = null;
    types.forEach(el => {
      if (highest == null) return highest = el;
      if (map[el] > map[highest]) return highest = el;
    });
    return highest;
  }
}
class MultiplicationNode extends Node {
  constructor(x, y, scale, svgEngine, type = "", embed = null, embedNode = null) {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-Basic-Multiply");
    this.setName("Multiply (Math)");
    this.setClass(Node.Class.BASIC);

    if (embed) this.embedBody(embed, embedNode);

    this.addInputSocket(InputSocketComponent.Type.NUMBER, "A", type);
    this.addInputSocket(InputSocketComponent.Type.NUMBER, "B", type);

    this.addOutputPlug(OutputPlugComponent.Type.NUMBER, "Product", type);

    return this;
  }
}
class MathNode extends Node {
  constructor(x, y, scale, svgEngine, type = "") {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-Basic-Math");
    this.setName("Add (Math)"); // default math operation
    this.setClass(Node.Class.BASIC);

    this.cStyle = type; // connector design

    this.setConnectionOffset(28 * this.scale);

    this.opSelect = new SVGSelect(10 * this.scale, 42 * this.scale, 180, this.scale, (data) => this.switched(data), (s) => this.mTop(s));
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
    switch (id) {
      case "add-concat":
        const addition = new AdditionNode(0, 0, this.scale, this.parentSVGEngine, this.cStyle, this.embeds.container, this);
        this.elements.push({
          element: addition, render: (el) => {
            el.createSVGElement();
          }
        });
        this.transfer(addition);
        console.log(this);
        if (!this.init) return addition.createSVGElement();
        this.init = false;
        break;
      case "multiply":
        const mult = new MultiplicationNode(0, 0, this.scale, this.parentSVGEngine, this.cStyle, this.embeds.container, this);
        this.elements.push({
          element: mult, render: (el) => {
            el.createSVGElement();
          }
        });
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
  mTop(state) {
    if (!state) return; // only run if it is expanding
    /*this.opSelect.renderContainer = this.parentSVGEngine.element;
    console.log(this);
    this.opSelect.moveToTop();*/ // don't do this... not good
  }
}
class StartEventNode extends Node {
  constructor(x, y, scale, svgEngine, type = "") {
    super(x, y, scale, svgEngine);

    this.setId("OpenVS-Base-Event-Start");

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
  constructor(onStart = null) {
    super();

    this.onStart = onStart;

    this.dragging = false;
    this.mouseStartPos = {}; // the mouse position when you start dragging to calc the offset
    this.mouseElemOffset = {}; // offset of the mouse position to the element

    this.interactions = window.userInteractionManager;

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
    }, () => { }, () => {
      // mouseup
      this.mouseStartPos = {};
      this.dragging = false;
    }, false, 1);
    this.interactions.initListeners(window, () => { }, (e) => {
      // mousemove
      if (!this.dragging) return;
      let xDiff = e.clientX - this.mouseStartPos.x;
      let yDiff = e.clientY - this.mouseStartPos.y;
      let x = this.nodeStartPos.x + xDiff;
      let y = this.nodeStartPos.y + yDiff;
      this.node.setPosition({ x: x, y: y });
    }, () => { });
  }
}
class Connector extends Component {
  static typesCompatible(input, output) {
    // input == the socket
    // output == the plug
    // Do NOT allow connections of data and flow connectors
    if (input == InputSocketComponent.Type.ANY && output !== OutputPlugComponent.Type.CONNECTOR) return true;
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

    window.openVS.connectors.push(this); // TODO: z-index stuff, you know what to do

    this.eventElem = document.createElement("span");

    this.plug = plug;
    this.currMousePos = mousePos;
    this.absCoords = absPlugCoords;
    this.id = uid();
    this.startPos = { x: this.x, y: this.y };
    this.moveListener = null;
    this.moveTarget = null;

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
    const idx = window.openVS.connectors.findIndex(e => e.id == this.id);
    if (idx == -1) return;
    window.openVS.connectors.splice(idx, 1);
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
    }, () => { }, () => { });
  }
  disconnect() {
    this.connectedTo.connected = false;
    this.connectedTo.disconnect(this);
    this.connectedTo = { id: null };
    this.connectedNode = null;
    this.plug.connected.splice(this.plug.connected.findIndex(el => el.id == this.id), 1);
    this.destroy();
  }
  attachMoveListener(el) { // the event to relocate the connector
    this.plug.interactions.initListeners(el, () => {
      this.plug.dragging = true; // the moving and destroying is done in the plugcomponent
      this.plug.snapping = false;
      this.plug.connected.splice(this.plug.connected.findIndex(el => el.id == this.id), 1);
      this.plug.initSnapping();
      this.plug.activeConnector = this;
      if (!this.connectedTo) return console.log("Weird stuff happening here. <Connector>(Line 1612)");
      this.connectedTo.connected = false;
      this.connectedTo.disconnect(this);
      this.moveTarget.removeEventListener("move", this.moveListener);
      this.connectedTo = { id: null };
      this.connectedNode = null;
    }, () => { }, () => { });
  }
  setMoveListener(l, t) {
    this.moveListener = l;
    this.moveTarget = t;
  }
}
class BezierConnector extends Connector {
  constructor(plug, mousePos, absPlugCoords, scale, color) {
    super(plug, mousePos, absPlugCoords, scale);

    this.color = color;

    this.sCircle = new Circle(0, 0, 6 * this.scale, false, this.scale); // the circle connected to the output plug
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

    this.eCircle = new Circle(end.x, end.y, 6 * this.scale, false, this.scale);
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
    this.eCircle.setPosition({ x: end.x, y: end.y });
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

    this.sCircle = new Circle(0, 0, 6 * this.scale, false, this.scale); // the circle connected to the output plug
    this.sCircle.setColor(this.color);
    this.elements.push({ element: this.sCircle, render: (el) => el.createSVGElement() });
    super.attachStartListener(this.sCircle.container);

    this.group = new Group();
    this.elements.push({ element: this.group, render: (el) => el.createSVGElement() });
    super.attachMoveListener(this.group.container);

    this.line = new Line(0, 0, this.currMousePos.x - this.x, this.currMousePos.y - this.y, 3 * this.scale);
    this.line.setColor(this.color);
    this.group.addComponent(this.line);

    this.eCircle = new Circle(this.currMousePos.x - this.x, this.currMousePos.y - this.y, 6 * this.scale, false, this.scale);
    this.eCircle.setColor(this.color);
    this.group.addComponent(this.eCircle);

    return this;
  }
  update() {
    const mousePos = this.mousePos;
    this.line.setPosition({ x: 0, y: 0 }, { x: mousePos.x - this.x, y: mousePos.y - this.y });
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
    switch (type) {
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

/**
 * @typedef {string} VerticalTextAnchor
 * @property {string} TOP Align the top edge to the y coordinate
 * @property {string} MIDDLE Align the text in the middle of the y coordinate.
 * @property {string} BOTTOM Align the bottom of the text to the y coordinate.
 * @see See {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/dominant-baseline}
 * for the documentation on HTML level.
 */
/**
 * @typedef {string} HorizontalTextAnchor
 * @property {string} START Align the start of the text to the x coordinate
 * @property {string} MIDDLE Aligne the middle of the text to the x coordinate
 * @property {string} END Align the end of the text to the x coordinate
 * @see See {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/text-anchor}
 * for an explanation of it.
 */
/**
 * @class
 * @classdesc A basic component to display text.
 */
class Text {
  /**
   * @enum {HorizontalTextAnchor}
   * @description Valid values for horizontal anchoring of the text.
   */
  static Anchor = {
    START: "start",
    MIDDLE: "middle",
    END: "end"
  }
  /**
   * @enum {VerticalTextAnchor}
   * @description Valid values for vertical anchoring of the text.
   */
  static VerticalAnchor = {
    TOP: "hanging",
    MIDDLE: "middle",
    BOTTOM: "auto"
  }
  /**
   * @description Initiates a new Text object.
   *
   * @param  {number} x                                  The x position in the parent container or viewport
   * @param  {number} y                                  The y position in the parent container or viewport
   * @param  {string} text                               The actual text content of the Text element.
   * @param  {number} scale                              The scale of the text element
   * @param  {HorizontalTextAnchor} anchor=Text.Anchor.START Aligns the text horizontally.
   * @param  {VerticalTextAnchor} vAnchor=Text.VerticalAnchor.BOTTOM Aligns the text vertically.
   * @return {Text}                                      The new Text object.
   *
   * @see See {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/text-anchor}
   * for more information about the horizontal anchor and {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/dominant-baseline}
   * for the vertical anchor.
   */
  constructor(x, y, text, scale, anchor = Text.Anchor.START, vAnchor = Text.VerticalAnchor.BOTTOM) {
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
  static getCanvasFont(el = document.body) {
    const fontWeight = Text.getCSSStyle(el, 'font-weight') || 'normal';
    const fontSize = Text.getCSSStyle(el, 'font-size') || '16px';
    const fontFamily = Text.getCSSStyle(el, 'font-family') || 'Times New Roman';

    return `${fontWeight} ${fontSize} ${fontFamily}`;
  }
  static measureText(text, font = Text.getCanvasFont()) {
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
    //    text.style.fontSize = parseInt(text.style.fontSize.replace("px", "")) * this.scale + "px";
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
  setComponentScale(newScale) {
    this.setScale(newScale);
  }

  move(deltaX, deltaY) {
    if ((!deltaX && deltaX !== 0) || ((!deltaY && deltaY !== 0))) throw "Invalid parameters! [" + this.constructor.name + ".move(deltaX, deltaY)]";
    this.x += deltaX;
    this.y += deltaY;
    this.updateAttributes();
    return { x: this.x, y: this.y };
  }
  /**
   * @description Set the text content of this element.
   *
   * @param  {string} t The new text content
   * @return {void}
   */
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
  moveTo(x, y, relative = false) {
    const instruction = {
      command: (relative) ? "m" : "M",
      content: " " + x + " " + y,
      id: this.uid()
    }
    this.instructions.push(instruction);
    return instruction.id;
  }
  lineTo(x, y, relative = false) {
    const instruction = {
      command: (relative) ? "l" : "L",
      content: " " + x + " " + y,
      id: this.uid()
    }
    this.instructions.push(instruction);
    return instruction.id;
  }
  cubicCurve(x1, y1, x2, y2, x, y, relative = false) {
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
  constructor(x, y, radius, cornerCoords, scale=1) {
    this.x = (cornerCoords) ? x + radius : x;
    this.y = (cornerCoords) ? y + radius : y;
    this.ox = x; // original x and y
    this.oy = y;
    this.r = radius;
    this.cornerCoords = cornerCoords;
    this.isComponent = true;
    this.scale = scale;

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
  setRadius(r, changePos = false) {
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
  setComponentScale(newScale) {
    const ratio = newScale / this.scale;
    this.r = this.r * ratio;
    if (this.cornercoords) {
      this.x = this.ox + this.r;
      this.y = this.oy + this.r;
    }
    this.updateAttributes();
  }
  createSVGElement() {
    return this.container;
  }
}
class Rectangle {
  constructor(x, y, width, height, rounded = false, radius = 0) {
    this.x = x;
    this.y = y;
    this.height = height;
    this.width = width;
    this.oheight = JSON.parse(JSON.stringify(height)); // copy, don't reference the values
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
    if (this.clipPath) {
      rect.setAttribute("clip-path", "url(#" + this.clipPath + ")");
      return rect;
    }
    if (!this.rounded) return rect;
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
  setComponentScale(scale) {
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
class SVGInput extends Component {
  constructor(x, y, width, scale, cb = () => { }) {
    super(x, y, width, 18, scale);

    this.htmlContainer = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    this.htmlContainer.setAttribute("width", this.tw);
    this.htmlContainer.setAttribute("height", this.th);
    this.elements.push({ element: this.htmlContainer, render: (el) => el });

    this.input = document.createElement("input");
    this.input.classList.add("openvs_graphics_input");
    this.htmlContainer.appendChild(this.input);

    this.storedData = "";
    this.cb = cb;

    var lastValue = "";
    var reset = false;
    this.input.onblur = () => {
      if (reset) { reset = false; return this.input.value = lastValue; }
      this.storedData = this.input.value;
      this.cb(this.input.value);
    }
    this.input.onfocus = () => {
      lastValue = this.input.value;
    }
    this.input.onkeyup = (e) => {
      if (!(e.code === "Enter" || e.code === "Escape")) return;
      if (e.code === "Escape") reset = true;
      this.input.blur();
    }

    return this;
  }
}
class SVGSelect extends Component {
  constructor(x, y, width, scale, cb = null, ccb = null) {
    super(x, y, width, 18, scale);

    this.callback = cb;
    this.ccb = ccb; // ccb == (called when the dropdown is opened)
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
    this.resetPlaceholder = false; // true == placeholder will stay the same
    this.items = [];

    this.container.addEventListener("pointerup", (e) => {
      if (e.target.id == this.bgRect.elem.id || e.target.id == this.path.container.id || e.target.id == this.selected.container.id) {
        this.toggle();
      }
    });

    return this;
  }
  addItem(label, id, cb = null) {
    const text = new Text(3, (18 * (this.items.length + 1) - 3) * this.scale, label, this.scale, Text.Anchor.START, Text.VerticalAnchor.BOTTOM);
    text.setColor("#808080");
    this.body.addComponent(text);
    this.items.push({ id: id, elem: text, cb: cb });
    text.container.addEventListener("pointerup", (e) => {
      const data = {
        selected: id,
        label: label,
        target: e.target,
        clientPos: {
          x: e.clientX,
          y: e.clientY
        }
      };
      if (cb) cb.call(this, data);
      if (this.callback) this.callback.call(this, data);
      if (!this.resetPlaceholder) this.selected.setText(label);
      this.expanded = 0;
      this.collapse();
    });
  }
  get dynamicPlaceholder() {
    return !this.resetPlaceholder;
  }

  /**
   * @description change wether to change the placeholder of the select to the selected item on click
   * @member
   * @param  {boolean} bool If this is set to true, then the default placeholder will be exchanged with the content of the item that was clicked.
   * @return {void}
   */
  set dynamicPlaceholder(bool) {
    this.resetPlaceholder = !bool;
  }
  toggle() {
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
    this.expanded = 1 - this.expanded; // math magic :D
    this.ccb.call(this, this.expanded);
  }
  expand() {
    this.bgRect.setStroke({
      color: "black",
      width: 1
    });
    this.path.container.style.d = 'path("' + this.flipped + '")';

    const h = Math.min(this.maxHeight, (18 * (this.items.length + 1)) * this.scale);
    console.log(h, this.dropRect, this.body);
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

    this.container.style.overflow = "visible";
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
  addComponent(c, render = (el) => el.createSVGElement()) {
    this.content.addComponent(c, render);
  }
}
class SVGCheckbox extends Component {
  constructor(x, y, scale, checked = false, clickCallback = () => { }) {
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
    this.interactions = window.userInteractionManager;

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

    /*this.dots.forEach((dot) => {
      dot.setPosition({ x: dot.ox + dotDiffX, y: dot.oy + dotDiffY });
    });*/

    if (!this.engine) return;
    this.engine.components.forEach(d => {
      let component = d.component;
      component.setPosition({ x: component.x + cXDiff, y: component.y + cYDiff });
    });
  }
  initPanning() {
    this.interactions.cancelCtxMenu(this.container.children[0]);
    this.interactions.initListeners(this.container, (e) => {
      // mousedown
      if (e.button != 2) return;
      this.dragging = true;
      this.mouseStartPos = {
        x: e.clientX,
        y: e.clientY
      };
    }, () => { }, (e) => {
      // mouseup
      this.dragging = false;
      this.mouseStartPos = { x: 0, y: 0 };
    }, false);
    this.interactions.initListeners(window, () => { }, (e) => {
      // mousemove on windows to prevent glitching when noving mouse over other elements
      if (!this.dragging) return;
      let xDiff = e.clientX - this.mouseStartPos.x;
      let yDiff = e.clientY - this.mouseStartPos.y;
      this.bgPos.x += xDiff;
      this.bgPos.y += yDiff;
      this.pan(xDiff, yDiff, e.movementX, e.movementY);
    }, () => { }, false)
  }
  createDots() {
    this.distance = 35; //this.baseDist * this.zoom;
    this.rad = this.dotRad //* this.zoom; don't scale this as this is done by the svg engine

    this.dots = [];
    this.columns = Math.ceil(this.width / this.distance);
    this.rows = Math.ceil(this.height / this.distance);

    return;
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
    this.container.append(this.bg.createSVGElement());
    this.container.append(...this.dots.map(el => el.createSVGElement()));
    this.initPanning();
    return this.container;
  }
  dispatchEvent(type, data) {
    return this[type + "Event"](data);
  }
  scaleEvent(data) {
    this.zoom = data;
    this.width /= data;
    this.height /= data;
    this.createSVGElement();
  }
}

/**
 * @class
 * @classdesc A Button Element
 * @augments Component
 */
class SVGButton extends Component {
  text = "Button";
  constructor(x, y, width, height, scale, text) {
    super(x, y, width, height, scale);

    this.text = text;

    // text color: #808080

    this.bgrd = new Rectangle(x, y, width, height, true);
    this.bgrd.setColor("#121212");
    this.bgrd.setStroke({ stroke: "#0f0f0f", width: 1 })
    this.elements.push({ element: this.bgrd });

    this.text = new Text()
  }
}

/**
 * @class
 * @classdesc The object managing the graphics and components
 */
class SVGEngine {
  variables = new Map()
  registry = null;
  constructor() {
    this.element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.element.setAttribute("height", window.innerHeight);
    this.element.setAttribute("width", window.innerWidth);
    this.element.style.touchAction = "none";
    this.element.style.userSelect = "none";
    this.element.id = "ULVS-Engine_" + (new Date()).getTime();
    document.body.appendChild(this.element);

    this.scale = 1;

    // separated container for connector elements so they stay on top
    /*this.connectorContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.connectorContainer.id = "connectors";
    this.element.appendChild(this.connectorContainer);*/

    // TODO: optimize panning; sub-viewport that just gets moved around (maybe)

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // setup global variables
    window.openVS = {
      nodes: {

      },
      connectors: [

      ]
    }

    this.body = new Viewport(0, 0, this.scale);
    this.body.container.classList.add("nodes");
    this.body.setViewboxAnchor(Transform.vXAnchor.CENTER, Transform.vYAnchor.MIDDLE);
    this.element.appendChild(this.body.createSVGElement());

    this.components = [];
    this.interfaces = [];
    this.scale = 1;
    this.maxZoom = {
      in: 1.7,
      out: 0.4
    }

    window.uid = () => {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    this.top = SVGEngine.getAbsCoords(this.element).y;
    this.left = SVGEngine.getAbsCoords(this.element).x;

    this.connTypeToggle = 1;

    if (!window.userInteractionManager) {
      Object.defineProperty(window, "userInteractionManager", {
        get: function() {
          if (this.openVS.readyIManager) return this.openVS.readyIManager;
          this.openVS.readyIManager = new UserInteractionManager();
          return this.openVS.readyIManager;
        }
      });
    }

    this.generateStyles();

    return this;
  }

  setNodeRegistry(r) {
    this.registry = r;
  }

  addUI(interf) {
    interf.attachEngine(this);
    this.interfaces.push(interf);
  }

  registerVariable(name) {
    if (this.variables.includes(name)) return false;
    this.variables.push(name);
    return true;
  }

  exportProgram() {
    const mapFlow = (start) => {
      console.log(start);
      if (start.plugs.filter(p => p.connected.length > 0).length == 0) return [start];

      let components = start.plugs.filter(p => p.connected.length > 0).map(pc => {
        return pc.connected.map(c => mapFlow(c.connectedTo.node)).flat(1);
      }).flat(1);

      return [start, ...components];
    }
    console.log(this.components);
    var flows = [];
    var additional = [];
    // collect involved nodes
    this.components.filter(e => e.component.nodeIdentifier == "OpenVS-Base-Event-Start").forEach(s => {
      const flow = mapFlow(s.component)

      flow.forEach(c => {
        additional.push(...c.inputSockets.filter(i => i.connected).map(i => i.con.plug.node))
      });

      flows.push(flow);
    });

    for (let i = 0, off = 0; i < additional.length; i++) { // remove duplicates from data source pool
      if (additional.filter(a => a.id == additional[i + off].id).length != 1) {
        additional.splice(i + off, 1);
        off -= 1;
      }
    }

    // map flow connections
    flows.map(f => {
      return f.map(c => {
        c.flowPlugs = Array(c.plugs.length);
        c.plugs.forEach((p, i) => {
          c.flowPlugs[i] = p.connected.map(con => {
            return {
              connectorId: con.id,
              conTo: con.connectedTo.node.id,
              targetPort: con.connectedTo.node.sockets.findIndex(s => s.id == con.connectedTo.id),
            }
          });
        });
        return c;
      });
    });

    console.log(additional);

    // map data connections
    additional = additional.map(n => {
      n.dataPlugs = Array(n.outputPlugs.length);
      n.outputPlugs.forEach((p, i) => {
        n.dataPlugs[i] = p.connected.map(con => {
          return {
            conTo: con.connectedTo.node.id,
            targetPort: con.connectedTo.node.inputSockets.findIndex(s => s.id == con.connectedTo.id),
            connectorId: con.id
          }
        });
      });
      return n;
    });

    const simplify = (node) => {
      return {
        x: node.x,
        y: node.y,
        scale: node.scale,
        flowPlugs: node.flowPlugs,
        dataPlugs: node.dataPlugs,
        identifier: node.nodeIdentifier,
        node: node.constructor.name,
        uid: node.id
      }
    }
    flows = flows.map(f => f.map(n => simplify(n)));
    additional = additional.map(n => simplify(n));

    console.log("flows", flows);
    console.log("additional", additional);

    return {
      flows,
      additional
    };
  }
  importProgram(exported) {
    const nodes = new Map();
    const spawnNode = (n) => {
      if (!this.registry.getNodeClass(n.node)) return;
      const node = new (this.registry.getNodeClass(n.node))(n.x, n.y, n.scale, this, "bezier");
      nodes.set(n.uid, node);
      this.addComponent(node);
    }
    exported.flows.forEach(f => {
      f.forEach(n => {
        spawnNode(n);
      });
      f.forEach(n => {
        if (!nodes.has(n.uid)) return;
        const node = nodes.get(n.uid);
        n.flowPlugs.forEach((p, i) => {
          p.forEach(c => {
            if (!nodes.has(c.conTo)) return;
            const target = nodes.get(c.conTo);
            node.plugs[i].connectTo(target.sockets[c.targetPort]);
          });
        });
      });
    });
    exported.additional.forEach(n => {
      spawnNode(n);
    });
    exported.additional.forEach(n => {
      if (!nodes.has(n.uid)) return;
      const node = nodes.get(n.uid);
      n.dataPlugs.forEach((p, i) => {
        p.forEach(c => {
          if (!nodes.has(c.conTo)) return;
          const target = nodes.get(c.conTo);
          node.outputPlugs[i].connectTo(target.inputSockets[c.targetPort]);
        });
      });
    });
  }
  clearWorkspace() {
    for (let id in window.openVS.nodes) {
      window.openVS.nodes[id].destroy();
    }
    let cons = window.openVS.connectors.slice();
    cons.forEach(c => c.destroy());
  }

  /**
   * @description Calling this function will generate an object containing all the
   * instructions a compiler should need. The data can be stringified for storage.
   *  **Work in Progress**
   *
   * @return {object}  The program specification.
   */
  generateProgramSpec() {
    // TODO: document program specification structure
    // find the start nodes
    const starts = this.components.filter(el => {
      return el.component instanceof StartEventNode;
    }).map(el => el.component);

    var follow = (f) => {
      // TODO: Stop recursion on visual loop
      let n = f[f.length - 1];

      // create new branch for every **connected** flow plug (if there is more than one)
      const sub = []; // new subBranches
      if (n.plugs.filter(p => p.connected.length != 0).length == 0) return f;

      const branches = [];
      n.plugs.forEach(plug => {
        if (plug.connected.length == 0) return branches.push([]);
        branches.push(...plug.connected);
      });
      if (branches.length == 1 && !n.forceBranch) {
        f.push(branches[0].connectedTo.node);
        return follow(f);
      }

      branches.forEach(connected => {
        if (connected.length == 0) return sub.push(connected);
        sub.push(follow([connected.connectedTo.node]));
      });
      if (n.nodeIdentifier != "OpenVS-Base-Basic-Condition") {
        f.push({
          id: "Connector-Branch-Split",
          branchCount: sub.length,
          inputs: [],
          outputs: [],
          uuid: "nil"
        });
      }
      f.push({
        id: "OVS-Branch",
        branches: sub
      });
      return f;
    }

    const flow = [];
    console.log(flow);
    starts.forEach(s => {
      flow.push(follow([s])); // create the basic flow order
    });

    console.log(flow);

    var traceDataSource = (component) => {
      let found = [component];
      component.inputSockets.filter(i => i.connected).forEach(i => {
        found.push(...traceDataSource(this.components.find(c => {
          return c.component.id == i.con.plug.node.id;
        }).component));
      });
      return found;
    }

    const additional = [];
    var mapComponent = (fc) => {
      if (!fc.inputSockets) fc.inputSockets = [];
      const is = fc.inputSockets.map(i => {
        if (i.connected) {
          const dataSource = this.components.filter(c => {
            return c.component.id == i.con.plug.node.id
          })[0].component;
          if (!dataSource) console.warn("This is not right.");
          let dependencies = traceDataSource(dataSource);
          dependencies.forEach(d => {
            if (additional.findIndex(e => e.id == d.id) == -1) additional.push(d);
          })
          if (additional.findIndex(e => e.id == dataSource.id) == -1) additional.push(dataSource);
        }
        const pid = (i.connected) ? i.con.plug.node.outputPlugs.findIndex(p => p == i.con.plug) : null;
        // TODO: add data sources to main flow
        return {
          inputSource: (i.connected) ? i.con.plug.node.id : null,
          required: i.required, // TODO: implement
          type: i.type,
          dataConstant: i.dataConstant,
          dataValue: i.storedData,
          portId: pid
        }
      });
      if (!fc.outputPlugs) fc.outputPlugs = [];
      const os = fc.outputPlugs.map(o => {
        return {
          type: o.type,
        }
      });
      return {
        is, os
      }
    }

    const basic = flow.slice();
    flow.length = 0;
    flow.push(...basic.map(flowBranch => { // convert the complex data to object spec
      return flowBranch.map(f => { // fc == flow component
        var mc = (fc) => {
          var m = (component) => {
            const d = mapComponent(component);
            return {
              id: component.identifier,
              inputs: d.is,
              outputs: d.os,
              uuid: component.id
            }
          }
          if (fc.id == "OVS-Branch") {
            return {
              id: fc.id,
              branches: fc.branches.map(branch => {
                return (!branch) ? branch : branch.map(c => {
                  return mc(c);
                });
              })
            };
          }
          return (fc.id != "Connector-Branch-Split") ? m(fc) : fc;
        }
        return mc(f);
      });
    }));
    const a = additional.map(el => {
      const d = mapComponent(el);
      d.uuid = el.id;
      d.id = el.identifier;
      return d;
    });
    return {
      flow,
      additional: a
    }
  }
  get renderElement() {
    return this.element;
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
    this.style.innerHTML += "  src: url('./assets/LibreFranklin-VariableFont_wght.ttf');\n";
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
  static createShadowFilter(dx = 3, dy = 3, x = "-50%", y = "-50%", deviation = 3) {
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
    this.background = bgrd;
    bgrd.attach(this);
    this.body.container.prepend(bgrd.createSVGElement());
  }
  zoomOut(delta=0.2) {
    if (this.scale - delta < this.maxZoom.out) return;
    this.scale -= delta;
    this.zoom();
  }
  zoomIn(delta=0.2) {
    if (this.scale - delta > this.maxZoom.in) return;
    this.scale += delta;
    this.zoom();
  }
  zoom() {
    this.body.setViewboxScale(this.scale);
    if (!this.background) return this.scale;
    this.background.bg.setWidth(this.background.width * (1 / this.scale));
    this.background.bg.setHeight(this.background.height * (1 / this.scale));
    this.background.dispatchEvent("scale", this.scale);
    return this.scale;
  }
  addComponent(c, render = (el) => el.createSVGElement()) {
    this.components.push({ component: c, render: render });
    if (c.attachEngine) c.attachEngine(this);
    this.body.container.appendChild(render(c));
  }
}
class RoundedTriangle {
  constructor(borderRadius = 2, width) {
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
    this.container.style.overflow = "visible";
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
    if (this.rot || this.scale) path.setAttribute("transform", ((this.scale) ? "scale(" + this.scale + ") " : " ") + ((this.rot) ? "rotate(" + this.rot + "," + (this.width / 2) + "," + (this.height / 2) + ")" : ""));
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

const addition = new AdditionNode(361, 381, 1, engine, "bezier");
engine.addComponent(addition);

const screen = new ScreenSizeNode(55, 347, 1, engine, "bezier");
engine.addComponent(screen);

const math = new MathNode(100, 100, 1, engine, "bezier");
engine.addComponent(math);

const add = new GeneralAdditionNode(100, 250, 1, engine, "bezier");
engine.addComponent(add);

const log = new ConsoleLogNode(100, 100, 1, engine, "bezier");
engine.addComponent(log);

const read = new VariableReadNode(200, 400, 1, engine, "bezier");
engine.addComponent(read);

const device = new IsMobileNode(55, 224, 1, engine, "bezier");
engine.addComponent(device);

const start = new StartEventNode(56, 56, 1, engine, "bezier");
engine.addComponent(start);

// engine.addComponent(condition.createPreview(350, 300));

class NodeRegistry {
  constructor() {
    this.classes = [];
    this.nodeClasses = [];

    return this;
  }
  addNodes(...nodes) {
    nodes.forEach((node) => this.addNode(node));
  }
  /**
   * @description adds a node to the registry
   *
   * @param  {object} node The config object of the data to add.
   * @param  {Class}  node.nodeClass The node to add
   * @param  {string} node.name The name of the node in the menu
   * @param  {string} node.class The class of the node
   * @return {void}
   */
  addNode(node) {
    const index = this.classes.findIndex(e => e.className == node.class);
    if (index === -1) throw "Unknown Class [" + this.constructor.name + ".addNode]";
    this.classes[index].nodes.push(node);
    this.nodeClasses.push(node.nodeClass);
  }
  /**
   * @description Add a new class to the registry
   *
   * @param  {object} c The config of the new class
   * @param  {string} c.className The id of the class
   * @param  {string} c.name The display name of the class
   * @param  {string} c.color The color of the class
   * @return {void}
   */
  addClassConfig(c) {
    if (!c) throw "Config cannot be null [" + this.constructor.name + ".addClassConfig]";
    c.nodes = [];
    this.classes.push(c);
  }

  /**
   * @description Get the class of a node by name
   *
   * @param  {string} name The class name of the node
   * @return {Class}  The class of the corresponding node
   */
  getNodeClass(name) {
    if (!name) throw "Class name cannot be null [" + this.constructor.name + ".getNodeClass]";
    return this.nodeClasses.find(el => el.name === name);
  }
}
/**
 * @class
 * @classdesc This class renders and administrates the block storages, where you can drag new nodes from.
 */
class UiBlockShelf {
  /**
   * @description Initiates the ui component.
   *
   * @param  {NodeRegistry} nodeReg=Node The registry object containign the available nodes.
   * @return {object}             The initiated object
   */
  constructor(nodeReg) {
    this.registry = nodeReg;
    this.engine = null;

    this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.container.setAttribute("x", 0);
    this.container.setAttribute("y", 0);
    this.container.setAttribute("width", 0); // change on attachEngine
    this.container.setAttribute("height", 0);

    this.shadow = SVGEngine.createShadowFilter(0, 1); // create the shadow defs element
    this.shadowElement = this.shadow.element;
    this.container.appendChild(this.shadowElement);

    this.bg = new Rectangle(10, 10, 0, 0, true, 4)
    this.bg.elem.style.maxHeight = "calc(100% - 20px)";
    this.bg.setShadow(this.shadow.id);
    this.bg.setColor("#121212");
    this.bg.setStroke({
      stroke: "#0f0f0f",
      width: 2
    });
    this.container.appendChild(this.bg.createSVGElement());

    this.body = new ScrollComponent(12, 12, 0, 0, 1);

    return this;
  }

  spawn(id, x, y=10) {
    x = x || this.tw + 10;
    let node = new (this.registry.getNodeClass(id))(x, y, this.engine.scale, this.engine, "bezier");
    this.engine.addComponent(node);
  }

  attachEngine(engine) {
    // TODO: visual previews of the blocks
    this.engine = engine;

    this.container.setAttribute("width", this.engine.width); // change on attachEngine
    this.container.setAttribute("height", this.engine.height);

    this.body.setWidth(this.engine.width * 0.2 - 4);
    this.body.setHeight(this.engine.height - 24);

    this.bg.setWidth(this.engine.width * 0.2);
    this.engine.element.appendChild(this.container);

    const ui = this;
    this.registry.classes.forEach((config, i) => {
      let y = (18 * i + 2 * i) * this.engine.scale;
      let select = new SVGSelect(0, y, this.engine.width * 0.2 - 5, 1, () => { }, function(_data) {
        let sel = this; // anonymous function scoped inside SVGSelect
        sel.renderContainer = ui.body.container;
        sel.moveToTop();
      });
      select.selected.container.innerHTML = config.name;
      select.dynamicPlaceholder = false;
      config.nodes.forEach(n => {
        select.addItem(n.name, n.nodeClass.name, (d) => {
          this.spawn(d.selected, d.clientPos.x - 25, d.clientPos.y - 15);
        });
      });
      this.body.addComponent(select);
    });
    let classCount = this.registry.classes.length;
    let height = Math.min(18 * this.engine.scale * classCount + ((classCount + 1) * 2), this.engine.height - 20);
    this.bg.setHeight(height);
    //this.bg.elem.after(this.body.createSVGElement());
    this.container.appendChild(this.body.createSVGElement());
  }
}

const reg = new NodeRegistry();
reg.addClassConfig({
  className: Node.Class.BASIC,
  color: Node.ClassColor[Node.Class.BASIC],
  name: Node.ClassName[Node.Class.BASIC]
});
reg.addClassConfig({
  className: Node.Class.CONSOLE,
  color: Node.ClassColor[Node.Class.CONSOLE],
  name: Node.ClassName[Node.Class.CONSOLE]
});
reg.addClassConfig({
  className: Node.Class.EVENT,
  color: Node.ClassColor[Node.Class.EVENT],
  name: Node.ClassName[Node.Class.EVENT]
});
reg.addClassConfig({
  className: Node.Class.DEVICEINFO,
  color: Node.ClassColor[Node.Class.DEVICEINFO],
  name: Node.ClassName[Node.Class.DEVICEINFO]
});

reg.addNode({
  nodeClass: StartEventNode,
  class: Node.Class.EVENT,
  name: "Start"
});
reg.addNode({
  nodeClass: ConditionNode,
  class: Node.Class.BASIC,
  name: "Condition"
});
reg.addNode({
  nodeClass: ConsoleLogNode,
  class: Node.Class.CONSOLE,
  name: "Console.log()"
});
reg.addNode({
  nodeClass: AdditionNode,
  class: Node.Class.BASIC,
  name: "Add (math)"
});
reg.addNode({
  nodeClass: IsMobileNode,
  class: Node.Class.DEVICEINFO,
  name: "Is Mobile?"
});
reg.addNode({
  nodeClass: ScreenSizeNode,
  class: Node.Class.DEVICEINFO,
  name: "Screen Size"
});
reg.addNode({
  nodeClass: VariableWriteNode,
  class: Node.Class.BASIC,
  name: "Write Variable"
});
reg.addNode({
  nodeClass: VariableReadNode,
  class: Node.Class.BASIC,
  name: "Read Variable"
});

const shelf = new UiBlockShelf(reg);
engine.addUI(shelf);
engine.setNodeRegistry(reg);
console.log(shelf);

document.body.style.overflow = "hidden";

const compiler = new Worker("worker.js");
compiler.onmessage = (e) => console.log(e.data);

function compile() {
  compiler.postMessage(engine.generateProgramSpec());
}

window.addEventListener("mousewheel", (e) => {
  e.preventDefault();
  if (e.deltaY > 0) {
    // zoom out
    engine.zoomOut(0.2);
  } else {
    // zoom in
    engine.zoomIn(0.2);
  }
});

const program = '{"flows":[[{"x":56,"y":56,"scale":1,"flowPlugs":[[{"connectorId":"lf8j514895ccyxorw1q","conTo":"lf8j5135lekpxyf5hao","targetPort":0}]],"identifier":"OpenVS-Base-Event-Start","node":"StartEventNode","uid":"lf8j513y0y38vjvvlyk"},{"x":375,"y":124,"scale":1,"flowPlugs":[[{"connectorId":"lf8j51498n3zllr7rnx","conTo":"lf8j513rrf4fhix3zzd","targetPort":0}],[{"connectorId":"lf8j5149bpdwajfk7f","conTo":"lf8j5139tt5k3bvzmad","targetPort":0}]],"identifier":"OpenVS-Base-Basic-Condition","node":"ConditionNode","uid":"lf8j5135lekpxyf5hao"},{"x":100,"y":100,"scale":1,"flowPlugs":[[]],"identifier":"OpenVS-Base-Console-Log","node":"ConsoleLogNode","uid":"lf8j513rrf4fhix3zzd"},{"x":704,"y":125,"scale":1,"flowPlugs":[[],[]],"identifier":"OpenVS-Base-Basic-Condition","node":"ConditionNode","uid":"lf8j5139tt5k3bvzmad"}]],"additional":[{"x":55,"y":224,"scale":1,"dataPlugs":[[{"conTo":"lf8j5135lekpxyf5hao","targetPort":0,"connectorId":"lf8j514axb4irw0h43"},{"conTo":"lf8j5139tt5k3bvzmad","targetPort":0,"connectorId":"lf8j514bqw5cp9zh88"},{"conTo":"lf8j513rrf4fhix3zzd","targetPort":0,"connectorId":"lf8j514cpt1rropukz"}]],"identifier":"OpenVS-Base-DInfo-Mobile","node":"IsMobileNode","uid":"lf8j513w3u5z42ai32d"}]}';

engine.importProgram(JSON.parse(program));

//module.exports = engine;
