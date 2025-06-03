const STUNServer = require("./stun_server.js");
const SignalingServer = require("./signaling_server.js");

class MageSignaling {
  constructor(argv) {
    this.argv = argv;
  }

  run() {
    console.log("Starting MageSignaling...");

    let stunServer = new STUNServer(this.argv);
    stunServer.run();

    let signalingServer = new SignalingServer(this.argv);
    signalingServer.run();

  }

}

module.exports = MageSignaling;