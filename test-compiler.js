// TODO: convert node script to worker script
const spec = require("./test-spec.json");

console.log(spec);

const nodeMap = {
  "OpenVS-Base-Basic-Condition": {
    script: "if ($in) {$further}",
    input: [ "in" ],
    suffix: ") {$further}"
  },
  "OpenVS-Base-DInfo-Mobile": {

  },
  "OpenVS-Base-Event-Start": {

  }
}
