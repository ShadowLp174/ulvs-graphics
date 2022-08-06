// git pre-commit hook to automatically hard reload cache on gh pages

const fs = require("fs");

// read index.html file
const file = fs.readFileSync("./index.html", "utf8");

// split it an the <script> element
const idx = file.indexOf("<script");
const parts = [file.substr(0, idx), file.substr(idx)];

// replace the src attribute
const id = Date.now();
parts[1] = parts[1].replace(/".*"/, '"index.js?cid=' + id + '"');

// join everything and write it to the file
fs.writeFileSync("./index.html", parts.join(""));
