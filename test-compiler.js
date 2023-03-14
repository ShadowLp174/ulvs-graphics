const compileSpec = require("./compiler.js");

// TODO: convert node script to worker script
const specification = require("./test-spec.json");
const fs = require("fs");

// BAD; WILL BE REWRITTEN LATER

console.log(specification);

let script = compileSpec(specification);

console.log("\n\n######### compiled ###########\n\n", script);
fs.writeFileSync(__dirname + "\\compiled.js", "// (unformatted) compiled spec from test-spec.json\n" + script);
