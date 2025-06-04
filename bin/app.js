#!/usr/bin/env node

const MageSignaling = require("..");
const package = require("../package.json");
const argv = require("minimist")(process.argv.slice(2),
  {
    boolean: ["help", "version"],
    number: ["port"],
    string: ["key_file", "cert_file", "auth_key"],
    alias: {
      "port": "p",
      "key_file": "k",
      "cert_file": "c",
      "auth_key": "a",
      "help": "h",
      "version": "v"
    },
    default: {
      "port": 19302,
      "auth_key": "MageSignaling@2025",
    }
  });

if (argv.help) {
  console.log("Usage:");
  console.log("  magesignaling --help // print help information");
  console.log("  magesignaling --port 19302 or -p 19302");
  process.exit(0);
}

if (argv.version) {
  console.log("Version:", package.version);
  process.exit(0);
}


let ms = new MageSignaling(argv);
ms.run();