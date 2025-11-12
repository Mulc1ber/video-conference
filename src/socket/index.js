import { io } from "socket.io-client";

const options = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 8000,
  transports: ["websocket"],

  // reconnection: true,
  // reconnectionDelay: 1000,
  // reconnectionDelayMax: 5000,
};

const socket = io("http://localhost:3001", options);

export default socket;
