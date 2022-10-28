# ULVS-Graphics (OpenVS Graphics)

The graphics engine to power the gui of the
 soon-to-be ULVS (Universal Libre Visual Scripting)
engine.  
This repo is under constant developement.

There are two index files. One PHP and one HTML file. The PHP file is for Apache based servers and automatically updates the cached files when updated. For the HTML file (like on the pages site) you have to force-reload using Ctrl+Shift+R.

[Live (Static) Status Quo Demo](https://carroted.github.io/ulvs-graphics)

[![Pages and Docs Deployment](https://github.com/Carroted/ulvs-graphics/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/Carroted/ulvs-graphics/actions/workflows/deploy.yml)
[![Mirroring](https://github.com/Carroted/ulvs-graphics/actions/workflows/mirror.yml/badge.svg)](https://github.com/Carroted/ulvs-graphics/actions/workflows/mirror.yml)

## Concept Art

![Concept art image](https://raw.githubusercontent.com/Carroted/ulvs-graphics/master/assets/concept-art.png)
![Second concept art image](https://raw.githubusercontent.com/Carroted/ulvs-graphics/master/assets/concept-art1.png)
![Third concept art image](https://raw.githubusercontent.com/Carroted/ulvs-graphics/master/assets/concept-art2.png)
![Fourth concept art image](https://raw.githubusercontent.com/Carroted/ulvs-graphics/master/assets/concept-art3.png)
Concept arts by asour

# Documentation

The documentation can be found on the github pages [here](https://carroted.github.io/ulvs-graphics/docs). It is still in development and will be improved over time.

# Compiling

Although the main focus is on the graphics and interactivity,
there is a basic js compiler ready. It is still in heavy developement.

To compile a visual script, you have to open the dev tools,
and run `JSON.stringify(engine.generateProgramSpec());`.
Copy the resulting string and put it inside `test-spec.json`.
As the compiler currently uses node, you'll have to have NodeJS
installed. Run `node test-compiler.js` and the resulting JS code
should pop up inside a file called `compiled.js`.

*Note: The compiler is just a side project until the graphics are ready, meaning it might not work. An API and documentation for it are part of the final ULVS*

## TODOs

*incomplete*

- Drawable comments
- "Code Blocks" Multiple Nodes snapping together
- Panning right click; Selecting left click
