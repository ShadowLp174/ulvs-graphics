// TODO: convert node script to worker script
const specification = require("./test-spec.json");
const fs = require("fs");

// BAD; WILL BE REWRITTEN LATER

console.log(specification);

const nodeMap = {
  "OpenVS-Base-Event-Start": {
    script: "(function() {$further})()",
  },
  "OpenVS-Base-Basic-Condition": {
    script: "if ($in) {$branch0} else {$branch1}",
    input: [ "in" ],
    branches: true,
    branchCount: 2
  },
  "Connector-Branch-Split": { // TODO: implement priorities
    script: function(data) {
      let s = "";
      let count = data.component.branchCount;
      for (let i = 0; i < count; i++) {
        s += "$branch" + i;
      }
      this.branchCount = 2;
      return s;
    },
    branches: true
  },
  "OpenVS-Base-DInfo-Mobile": {
    function: true,
    script: `function OVSBIsMobile() {
      return typeof screen.orientation !== 'undefined';
    }`,
    output: ["OVSBIsMobile()"]
  },
  "OpenVS-Base-Console-Log": {
    script: "console.log($in);$further",
    input: [ "in" ],
    branches: false
  },
  "OpenVS-Base-DInfo-SSize": {
    function: true,
    script: `function OVSBScreenHeight() {return window.screen.height;}
    function OVSBScreenWidth() {return window.screen.width;}`,
    output: ["OVSBScreenWidth()", "OVSBScreenHeight()"]
  },
  "OpenVS-Base-Variable-Write": {
    init: "var $in1 = $in2",
    script: "$in1 = $in2"
  },
  "OpenVS-Base-Basic-Add": {
    script: "var additionResult = $in1 + $in2",
    input: ["in1", "in2"],
    output: ["additionResult"]
  },
  "OpenVS-Base-Variable-Read": {
    function: false,
    script: "$name",
    output: [ "$#script" ], // values starting with `$#` are system-reserved
    input: [ "name" ],
    ignoreSource: true
  },
  "OpenVS-Base-Variable-Write": {
    script: "var $name = '$val';$further",
    input: [ "name", "val" ],
    output: []
  }
}

var converToFlowComponent = (addComponent) => {
  const ret = {};
  for (key in addComponent) {
    if (key == "os") {
      ret.outputs = addComponent[key];
    } else if (key == "is") {
      ret.inputs = addComponent[key];
    } else {
      ret[key] = addComponent[key];
    }
  }
  return ret;
}
const defaultTypeFormat = {
  str: "'$value'",
  default: "$value"
}
function formatType(value, type) {
  const config = specification.typeFormatting || defaultTypeFormat;
  const t = (!config[type]) ? "default" : type;
  return config[t].replace(/\$value/g, value);
}
const compileSpec = (spec) => {
  var snippets = [];
  var functions = [];
  spec.flow.forEach(f => {
    var processFlow = (flow, sns, nLevel=0) => { // nLevel == how deep is this iteration nested
      flow.forEach((component, _i) => {
        if (component.id == "OVS-Branch") {
          component.branches = component.branches.map(b => {
            return processFlow(b,[], (nLevel + 1));
          });
          component.nestedLevelId = nLevel;
          return sns.push(component);
        };
        // TODO: find better way of deep copying an object/write utility for it
        let snippet = Object.assign({}, nodeMap[component.id]); // WARNING: only performs a partial copy, nested objects will not be cloned!!!
        if (typeof snippet.script == "function") {
          snippet.script = snippet.script({ object: snippet, component });
        }
        snippet.nestedLevelId = nLevel;
        if (snippet.branches) {
          snippet.script = snippet.script.replace(/\$branch/g, "$nl" + nLevel + "branch");
        }
        const inputScripts = [];
        if (component.inputs) {
          if (component.inputs.length > 0) {
            const is = [];
            component.inputs.forEach(input => {
              if (!input.inputSource) {
                if (!input.dataConstant) return;
                console.log("fill", input);
                is.push(input.dataValue);
                return;
              }
              let source = nodeMap[spec.additional.find(a => a.uuid == input.inputSource).id];
              if (!source) return console.warn("Something's weird lol");
              if (source.function) {
                if (functions.findIndex(e => e.script == source.script) === -1)functions.push(source);
              } else {
                sourceComponent = converToFlowComponent(spec.additional.find(a => a.uuid == input.inputSource));
                console.log("source", sourceComponent, source);
                let traced = {
                  additional: spec.additional,
                  flow: [[sourceComponent]] // flow array contains the flow, which is an array of components
                }
                let inp = compileSpec(traced);
                console.log("compiled source", inp);
                if (!source.ignoreSource) {
                  inputScripts.push(inp);
                } else {
                  source.output = source.output.map(e => {
                    return e.replace(/\$#script/gi, inp)
                  });
                }
              }
              is.push(source.output[input.portId])
            });
            console.log("sni", snippet)
            snippet.input.forEach((i, index) => {
              snippet.script = snippet.script.replace("$" + i, is[index]);
            });
            snippet.script = inputScripts.join("\n") + "\n" + snippet.script;
          }
        }
        sns.push(snippet);
      });
      return sns;
    }
    snippets = processFlow(f,[]);
  });

  var script = "";
  functions.forEach(f => {
    script += f.script;
  });
  script += "\n$further";
  var compile = (s, sns) => {
    sns.forEach((snippet, i) => {
      const last = (i == sns.length - 1);
      if (last && snippet.id != "OVS-Branch") {
        if (snippet.branches == true) {
          for (let j = 0; j < snippet.branchCount; j++) {
            snippet.script = snippet.script.replace("$nl" + snippet.nestedLevelId + "branch" + j, "");
          }
        }
      }
      if (snippet.id != "OVS-Branch") return s = s.replace(/\$further/, snippet.script);

      snippet.branches.forEach((b, j) => { // b == branch
        s = s.replace("$nl" + snippet.nestedLevelId + "branch" + j, compile("$further", b))
      });
    });
    return s;
  }
  script = compile(script, snippets).replace(/\$further/g, "");
  return script.trim();
}
let script = compileSpec(specification);

console.log("\n\n######### compiled ###########\n\n", script);
fs.writeFileSync(__dirname + "\\compiled.js", "// (unformatted) compiled spec from test-spec.json\n" + script);
