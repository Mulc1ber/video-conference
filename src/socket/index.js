import { io } from "socket.io-client";

const options = {
  "force new connection": true,
  reconnectionAttempts: "Infinity", // avoid having user reconnect manually in order to prevent dead clients after a server restart
  timeout: 10000, // before connect_error and connect_timeout are emitted.
  transports: ["websocket"],

  // reconnection: true,
  // reconnectionDelay: 1000,
  // reconnectionDelayMax: 5000,
};

const socket = io("http://localhost:3001", options);
// const socket = io("/", options);

export default socket;
