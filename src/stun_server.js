const stun = require("stun");

class STUNServer {
  constructor(argv) {
    this.argv = argv;
  }

  run() {
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
}

module.exports = STUNServer;