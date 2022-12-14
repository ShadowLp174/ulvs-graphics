// (unformatted) compiled spec from test-spec.json
function OVSBIsMobile() {
      return typeof screen.orientation !== 'undefined';
    }
(function() {
console.log(OVSBIsMobile());function OVSBScreenHeight() {return window.screen.height;}
    function OVSBScreenWidth() {return window.screen.width;}

var additionResult = OVSBScreenWidth() + OVSBScreenHeight()
console.log(additionResult);})()