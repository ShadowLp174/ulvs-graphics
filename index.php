<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <title>OpenVS Graphics Test</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="<?php $link = "style.css"; echo $link . "?q=" . filemtime($link);?>"></link>
    <meta name="og:description" content="Test site for OpenVS Graphics, the Graphics Engine behind ULVS" />
    <meta name="og:image" content="" />
    <meta name="og:title" content="OpenVS Graphics Test" />
  </head>
  <body style="padding: 0; margin: 0">
    <script src="<?php $link = "./index.js"; echo $link . "?q=" . filemtime($link);?>"></script>
    <script>
      function require(url){
        if (url.toLowerCase().substr(-3)!=='.js') url+='.js'; // to allow loading without js suffix;
        if (!require.cache) require.cache=[]; //init cache
        var exports=require.cache[url]; //get from cache
        if (!exports) { //not cached
          try {
            exports={};
            var X=new XMLHttpRequest();
            X.open("GET", url, 0); // sync
            X.send();
            if (X.status && X.status !== 200)  throw new Error(X.statusText);
            var source = X.responseText;
            // fix (if saved form for Chrome Dev Tools)
            if (source.substr(0,10)==="(function("){
              var moduleStart = source.indexOf('{');
              var moduleEnd = source.lastIndexOf('})');
              var CDTcomment = source.indexOf('//@ ');
              if (CDTcomment>-1 && CDTcomment<moduleStart+6) moduleStart = source.indexOf('\n',CDTcomment);
              source = source.slice(moduleStart+1,moduleEnd-1);
            }
            // fix, add comment to show source on Chrome Dev Tools
            source="//@ sourceURL="+window.location.origin+url+"\n" + source;
            //------
            var module = { id: url, uri: url, exports:exports }; //according to node.js modules
            var anonFn = new Function("require", "exports", "module", source); //create a Fn with module code, and 3 params: require, exports & module
            anonFn(require, exports, module); // call the Fn, Execute the module
            require.cache[url]  = exports = module.exports; //cache obj exported by module
          } catch (err) {
            throw new Error("Error loading module "+url+": "+err);
          }
        }
        return exports; //require returns object exported by module
      }
      //console.log(require("./index.js"));
      // TODO: migrate to module loading like above
    </script>
  </body>
</html>
