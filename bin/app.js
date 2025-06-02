const MageSignaling = require("..");
const path = require("path");
const currentFilePath = path.resolve(__dirname);
const argv = require("minimist")(process.argv.slice(2),
  {
    string: ["key_file", "cert_file", "stun_port", "signaling_port", "auth_key"],
    alias: {
      "key_file": "k",
      "cert_file": "c",
      "stun_port": "r",
      "signaling_port": "s",
      "auth_key": "a",
    },
    default: {
      "key_file": path.join(currentFilePath, "key.pem"),
      "cert_file": path.join(currentFilePath, "cert.pem"),
      "stun_port": 19302,
      "signaling_port": 8080,
      "auth_key": "MageSignaling@2025"
    }
  });

if (argv.help) {
  console.log("Usage:");
  console.log("  magesignaling --help // print help information");
  console.log("  magesignaling --stun_port 19302 or -r 19302");
  console.log("  magesignaling --signaling_port 8080 or -s 8080");
  process.exit(0);
}


let ms = new MageSignaling(argv);
ms.run();