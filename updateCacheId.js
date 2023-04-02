// git pre-commit hook to automatically hard reload cache on gh pages

const fs = require("fs");

// read index.html file
const file = fs.readFileSync("./index.html", "utf8");
const worker = fs.readFileSync("./worker.js", "utf8");

// split it an the <script> element
const idx = file.indexOf("<script");
const parts = [file.substr(0, idx), file.substr(idx)];

// same for worker
const i = worker.indexOf("require(", 320);
const ps = [worker.substr(0, i), worker.substr(i)];

// replace the src attribute
const id = Date.now();
parts[1] = parts[1].replace(/".*"/, '"index.js?cid=' + id + '"');

ps[1] = ps[1].replace(/".*"/, '"compiler.js?cid=' + Date.now() + '"');

// join everything and write it to the file
fs.writeFileSync("./index.html", parts.join(""));

fs.writeFileSync("./worker.js", ps.join(""));
