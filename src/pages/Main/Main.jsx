import React, { useEffect, useRef, useState } from "react";
import socket from "../../socket";
import ACTIONS from "../../socket/actions";
import { useNavigate } from "react-router";
import { v4 } from "uuid";

export const Main = () => {
  const [rooms, updateRooms] = useState([]);
  const rootNode = useRef();

  const navigate = useNavigate();

  useEffect(() => {
    socket.on(ACTIONS.SHARED_ROOMS, ({ rooms = [] } = {}) => {
      if (rootNode.current) {
        updateRooms(rooms);
      }
    });
  }, []);

  return (
    <div ref={rootNode}>
      <h1>Available Rooms</h1>

      <ul>
        {rooms.map((roomId) => (
          <li key={roomId}>
            <span>{roomId}</span>
            <button onClick={() => navigate(`/room/${roomId}`)}>
              Join Room
            </button>
          </li>
        ))}
      </ul>

      <button onClick={() => navigate(`/room/${v4()}`)}>Creat New Room</button>
    </div>
  );
};
