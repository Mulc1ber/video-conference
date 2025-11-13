// const path = require("path");
// const express = require("express");
// const app = express();

// const http = require("http");
// const server = http.createServer(app);

// const { Server } = require("socket.io");
// const io = new Server(server);

// const PORT = process.env.PORT || 3000;

// // app.use(express.static(path.join(__dirname, "public")));

// // app.get("/", (req, res) => {
// //   res.sendFile(path.join(__dirname, "index.html"));
// // });

// io.on("connection", (socket) => {
//   console.log("a user connected");
// });

// server.listen(PORT, () => {
//   console.log(`listening on *:${PORT}`);
// });

import path from "path";
import express from "express";
const app = express();

import http from "http";
const server = http.createServer(app);

import { Server } from "socket.io";
const io = new Server(server);
import { version, validate } from "uuid";

import ACTIONS from "./src/socket/actions.js";
const PORT = process.env.PORT || 3001;

function getClientRooms() {
  const { rooms } = io.sockets.adapter;

  return Array.from(rooms.keys()).filter(
    (roomId) => validate(roomId) && version(roomId) === 4
  );
}

function shareRoomsInfo() {
  io.emit(ACTIONS.SHARED_ROOMS, {
    rooms: getClientRooms(),
  });
}

io.on("connection", (socket) => {
  shareRoomsInfo();

  socket.on(ACTIONS.JOIN, (config) => {
    const { room: roomId } = config;
    const { rooms: joinedRooms } = socket;

    if (Array.from(joinedRooms).includes(roomId)) {
      return console.warn("Already joined room", roomId);
    }

    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

    clients.forEach((clientId) => {
      io.to(clientId).emit(ACTIONS.ADD_PEER, {
        peerId: socket.id,
        createOffer: false,
      });

      socket.emit(ACTIONS.ADD_PEER, {
        peerId: clientId,
        createOffer: true,
      });
    });

    socket.join(roomId);

    shareRoomsInfo();
  });

  function leaveRoom() {
    const { rooms } = socket;

    Array.from(rooms)
      // LEAVE ONLY CLIENT CREATED ROOM
      .filter((roomId) => validate(roomId) && version(roomId) === 4)
      .forEach((roomId) => {
        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

        clients.forEach((clientId) => {
          io.to(clientId).emit(ACTIONS.REMOVE_PEER, {
            peerId: socket.id,
          });

          socket.emit(ACTIONS.REMOVE_PEER, {
            peerId: clientId,
          });
        });

        socket.leave(roomId);
      });

    shareRoomsInfo();
  }

  socket.on(ACTIONS.LEAVE, leaveRoom);
  socket.on("disconnecting", leaveRoom);

  socket.on(ACTIONS.RELAY_SDP, ({ peerId, sessionDescription }) => {
    io.to(peerId).emit(ACTIONS.SESSION_DESCRIPTION, {
      peerId: socket.id,
      sessionDescription,
    });
  });

  socket.on(ACTIONS.RELAY_ICE, ({ peerId, iceCandidate }) => {
    io.to(peerId).emit(ACTIONS.ICE_CANDIDATE, {
      peerId: socket.id,
      iceCandidate,
    });
  });
});

server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
