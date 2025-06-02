const fs = require("fs");
const ws = require("ws");
const stun = require("stun");
const https = require("https");

class MageSignaling {
  constructor(argv) {
    this.argv = argv;
  }

  run() {
    this.startSTUNServer();
    this.startSignalingServer();
  }

  startSTUNServer() {
    const server = stun.createServer({ type: "udp4" });

    const { STUN_BINDING_RESPONSE, STUN_EVENT_BINDING_REQUEST } = stun.constants;
    const userAgent = `node/${process.version} stun/v1.0.0`;

    server.on(STUN_EVENT_BINDING_REQUEST, (request, rinfo) => {
      const message = stun.createMessage(STUN_BINDING_RESPONSE, request.transactionId);

      message.addXorAddress(rinfo.address, rinfo.port);
      message.addSoftware(userAgent);

      server.send(message, rinfo.port, rinfo.address);
    });

    server.listen(this.argv.stun_port, () => {
      console.log("[stun] server started on port", this.argv.stun_port);
    });
  }

  startSignalingServer() {
    const server = https.createServer({
      cert: fs.readFileSync(this.argv.cert_file),
      key: fs.readFileSync(this.argv.key_file)
    });

    const wss = new ws.WebSocketServer({ server });

    wss.on("connection", (ws) => {
      ws.on("error", console.error);
      ws.on("message", (data) => {
        console.log("received: %s", data);
      });
    });

    server.listen(this.argv.signaling_port, () => {
      console.log("[signaling] server started on port", this.argv.signaling_port);
    });
  }

}

module.exports = MageSignaling;