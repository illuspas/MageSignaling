#!/usr/bin/env node

const MageSignaling = require("..");
const path = require("path");
const currentFilePath = path.resolve(__dirname);
const argv = require("minimist")(process.argv.slice(2),
  {
    string: ["port", "key_file", "cert_file", "auth_key"],
    alias: {
      "port": "p",
      "key_file": "k",
      "cert_file": "c",
      "auth_key": "a",
    },
    default: {
      "port": 19302,
      "key_file": path.join(currentFilePath, "key.pem"),
      "cert_file": path.join(currentFilePath, "cert.pem"),
      "auth_key": "MageSignaling@2025"
    }
  });

if (argv.help) {
  console.log("Usage:");
  console.log("  magesignaling --help // print help information");
  console.log("  magesignaling --port 19302 or -p 19302");
  process.exit(0);
}


let ms = new MageSignaling(argv);
ms.run();