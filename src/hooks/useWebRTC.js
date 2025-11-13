import { useCallback, useEffect, useRef } from "react";
import useStateWithCallback from "./useStateWithCallback";
import socket from "../socket";
import ACTIONS from "../socket/actions";
import freeice from "freeice";

export const LOCAL_VIDEO = "LOCAL_VIDEO";

export default function useWebRTC(roomId) {
  const [clients, updateClients] = useStateWithCallback([]);

  const addNewClient = useCallback(
    (newClient, cb) => {
      updateClients((list) => {
        if (!list.includes(newClient)) {
          return [...list, newClient];
        }

        return list;
      }, cb);
    },
    [clients, updateClients]
  );

  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
  });

  useEffect(() => {
    async function handleNewPeer({ peerId, createOffer }) {
      if (peerId in peerConnections.current) {
        return console.warn("Already connected to peer", peerId);
      }

      peerConnections.current[peerId] = new RTCPeerConnection({
        iceServers: freeice(),
      });

      peerConnections.current[peerId].onicecandidate = (event) => {
        if (event.onicecandidate) {
          socket.emit(ACTIONS.RELAY_ICE, {
            peerId,
            iceCandidate: event.candidate,
          });
        }
      };

      let tracksNumber = 0;
      peerConnections.current[peerId].ontrack = ({
        streams: [remoteStream],
      }) => {
        tracksNumber++;

        if (tracksNumber == 2) {
          // video & audio tracks received
          tracksNumber = 0;
          addNewClient(peerId, () => {
            if (peerMediaElements.current[peerId]) {
              peerMediaElements.current[peerId].srcObject = remoteStream;
            } else {
              // FIX LONG RENDER IN CASE OF MANY CLIENTS
              let settled = false;
              const interval = setInterval(() => {
                if (peerMediaElements.current[peerId]) {
                  peerMediaElements.current[peerId].srcObject = remoteStream;

                  settled = true;
                }

                if (settled) {
                  clearInterval(interval);
                }
              }, 1000);
            }
          });
        }
      };

      localMediaStream.current.getTracks().forEach((track) => {
        peerConnections.current[peerId].addTrack(
          track,
          localMediaStream.current
        );
      });

      if (createOffer) {
        const offer = await peerConnections.current[peerId].createOffer();
        await peerConnections.current[peerId].setLocalDescription(offer);
        socket.emit(ACTIONS.RELAY_SDP, {
          peerId,
          sessionDescription: offer,
        });
      }
    }

    socket.on(ACTIONS.ADD_PEER, handleNewPeer);

    return () => {
      socket.off(ACTIONS.ADD_PEER);
    };
  }, []);

  useEffect(() => {
    async function setRemoteMedia({
      peerId,
      sessionDescription: remoteDescription,
    }) {
      await peerConnections.current[peerId]?.setRemoteDescription(
        new RTCSessionDescription(remoteDescription)
      );

      if (remoteDescription.type == "offer") {
        const answer = await peerConnections.current[peerId].createAnswer();
        await peerConnections.current[peerId].setLocalDescription(answer);
        socket.emit(ACTIONS.RELAY_SDP, {
          peerId,
          sessionDescription: answer,
        });
      }
    }

    socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);

    return () => {
      socket.off(ACTIONS.SESSION_DESCRIPTION);
    };
  }, []);

  useEffect(() => {
    socket.on(ACTIONS.ICE_CANDIDATE, ({ peerId, iceCandidate }) => {
      peerConnections.current[peerId]?.addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      );
    });

    return () => {
      socket.off(ACTIONS.ICE_CANDIDATE);
    };
  }, []);

  useEffect(() => {
    const handleRemovePeer = ({ peerId }) => {
      if (peerConnections.current[peerId]) {
        peerConnections.current[peerId].close();
      }

      delete peerConnections.current[peerId];
      delete peerMediaElements.current[peerId];

      updateClients((prev) => prev.filter((id) => id !== peerId));
    };

    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);

    return () => {
      socket.off(ACTIONS.REMOVE_PEER);
    };
  }, []);

  useEffect(() => {
    async function startCapture() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 1280,
          height: 720,
        },
      });

      addNewClient(LOCAL_VIDEO, () => {
        const localVieoElement = peerMediaElements.current[LOCAL_VIDEO];

        if (localVieoElement) {
          localVieoElement.volume = 0;
          localVieoElement.srcObject = localMediaStream.current;
        }
      });
    }

    startCapture()
      .then(() => socket.emit(ACTIONS.JOIN, { room: roomId }))
      .catch((err) => console.error("User denied media access", err));

    return () => {
      localMediaStream.current.getTracks().forEach((track) => track.stop());

      socket.emit(ACTIONS.LEAVE);
    };
  }, [roomId]);

  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return { clients, provideMediaRef };
}
