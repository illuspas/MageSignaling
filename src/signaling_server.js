const fs = require("fs");
const ws = require("ws");
const url = require("url");
const http = require("http");
const https = require("https");
const crypto = require("crypto");

class SignalingServer {
  constructor(argv) {
    this.argv = argv;
    this.rooms = new Map(); // { [roomId]: { [userId]: WebSocket } }
  }

  run() {
    const server = this.argv.cert_file && this.argv.key_file ? https.createServer({
      cert: fs.readFileSync(this.argv.cert_file),
      key: fs.readFileSync(this.argv.key_file)
    }) : http.createServer();

    const wss = new ws.WebSocketServer({ server });

    wss.on("connection", (ws, req) => {
      const query = url.parse(req.url, true).query;
      const token = query.token;
      const roomId = query.roomId;
      const userId = query.userId;

      if (!roomId || !userId) {
        ws.close(4000, "Missing token or roomId or userId parameter");
        return;
      }

      if (this.argv.auth_key) {
        if (!token) {
          ws.close(4000, "Missing token parameter");
          return;
        }
        let signStr = `${roomId}-${userId}-${this.argv.auth_key}`;
        let sign = crypto.createHash("md5").update(signStr).digest("hex");
        if (sign !== token) {
          ws.close(4001, "Invalid token");
          return;
        }
      }
      console.log("WebSocket connection established", roomId, userId);

      // 添加用户到房间
      this.addUserToRoom(ws, roomId, userId);

      // 连接关闭处理
      ws.on("close", () => {
        this.removeUserFromRoom(roomId, userId);
      });

      // 错误处理
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.removeUserFromRoom(roomId, userId);
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, roomId, userId, message);
        } catch (error) {
          console.error("Error parsing message:", error);
          this.sendError(ws, "Invalid message format");
        }
      });
    });

    wss.on("error", (err) => {
      console.error("WebSocket server error:", err);
    });

    server.listen(this.argv.port, () => {
      console.log("[signaling] server started on TCP port", this.argv.port);
    });
  }

  addUserToRoom(ws, roomId, userId) {
    // 初始化房间如果不存在
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
      console.log(`New room created: ${roomId}`);
    }

    const room = this.rooms.get(roomId);

    // 检查用户是否已在房间中
    if (room.has(userId)) {
      this.sendError(ws, `User ID ${userId} is already in room ${roomId}`);
      ws.close(4001, "Duplicate user ID");
      return;
    }

    // 添加用户到房间
    room.set(userId, ws);

    // 通知房间中的其他用户有新用户加入
    this.broadcastToRoom(roomId, {
      type: "join",
      from: userId,
      timestamp: Date.now()
    }, userId); // 排除自己

    console.log(`User ${userId} joined room ${roomId}`);
  }

  /**
   * 从房间中移除用户
   * @param {string} roomId 房间ID
   * @param {string} userId 用户ID
   */
  removeUserFromRoom(roomId, userId) {
    if (!this.rooms.has(roomId)) return;

    const room = this.rooms.get(roomId);
    if (!room.has(userId)) return;

    room.delete(userId);

    // 如果房间为空，删除房间
    if (room.size === 0) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    } else {
      // 通知其他用户有用户离开
      this.broadcastToRoom(roomId, {
        type: "leave",
        from: userId,
        timestamp: Date.now()
      });
    }

    console.log(`User ${userId} left room ${roomId}`);
  }

  /**
   * 处理收到的消息
   * @param {WebSocket} ws WebSocket连接
   * @param {string} roomId 房间ID
   * @param {string} userId 用户ID
   * @param {object} message 消息对象
   */
  handleMessage(ws, roomId, userId, message) {
    // 基本消息验证
    if (!message.type) {
      this.sendError(ws, "Message type is required");
      return;
    }

    if (message.to) {
      // 处理1对1消息
      this.sendToUser(roomId, userId, message.to, {
        ...message,
        from: userId,
        timestamp: Date.now()
      });
    } else {
      // 处理广播消息
      this.broadcastToRoom(roomId, {
        ...message,
        from: userId,
        timestamp: Date.now()
      }, userId); // 排除自己
    }
  }

  /**
   * 发送消息给特定用户
   * @param {string} roomId 房间ID
   * @param {string} fromUserId 发送者用户ID
   * @param {string} toUserId 接收者用户ID
   * @param {object} message 消息内容
   */
  sendToUser(roomId, fromUserId, toUserId, message) {
    if (!this.rooms.has(roomId)) {
      console.error(`Room ${roomId} not found for 1:1 message`);
      return;
    }

    const room = this.rooms.get(roomId);
    const targetWs = room.get(toUserId);

    if (!targetWs) {
      console.error(`User ${toUserId} not found in room ${roomId}`);
      // 通知发送者目标用户不存在
      const senderWs = room.get(fromUserId);
      if (senderWs) {
        this.sendError(senderWs, `User ${toUserId} not found in room`);
      }
      return;
    }

    try {
      targetWs.send(JSON.stringify(message));
      console.log(`Message from ${fromUserId} to ${toUserId} in room ${roomId}`);
    } catch (error) {
      console.error("Error sending message to user:", error);
    }
  }

  /**
   * 广播消息到整个房间
   * @param {string} roomId 房间ID
   * @param {object} message 消息内容
   * @param {string} [excludeUserId] 要排除的用户ID
   */
  broadcastToRoom(roomId, message, excludeUserId = null) {
    if (!this.rooms.has(roomId)) {
      console.error(`Room ${roomId} not found for broadcast`);
      return;
    }

    const room = this.rooms.get(roomId);
    let count = 0;

    room.forEach((ws, userId) => {
      if (userId === excludeUserId) return;

      try {
        ws.send(JSON.stringify(message));
        count++;
      } catch (error) {
        console.error(`Error broadcasting to user ${userId}:`, error);
      }
    });

    console.log(`Broadcast in room ${roomId} to ${count}/${room.size} users`);
  }

  /**
   * 发送错误消息
   * @param {WebSocket} ws WebSocket连接
   * @param {string} errorMsg 错误消息
   */
  sendError(ws, errorMsg) {
    try {
      ws.send(JSON.stringify({
        type: "error",
        payload: errorMsg,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error("Error sending error message:", error);
    }
  }
}

module.exports = SignalingServer;