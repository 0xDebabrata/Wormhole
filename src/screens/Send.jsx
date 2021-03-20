import React, { useEffect } from 'react';
import firebase from '../firebase'

const Send = () => {

  const config = {
    iceServers: [{
      urls: ["stun:stun.l.google.com:19302", "stun:stun2.l.google.com:19302"]
    }],
    iceCandidatePoolSize: 10,
  }
  const pc = new RTCPeerConnection(config)
  const channel = pc.createDataChannel("chat")
  

  // Collect ice candidates
  const collectIceCandidates = async (roomRef, peerConn, localName, remoteName) => {
    const candidatesCollection = roomRef.collection(localName)

    peerConn.addEventListener('icecandidate', (e) => {
      if (e.candidate) {
        const json = e.candidate.toJSON()
        candidatesCollection.add(json)
      }
    })

    roomRef.collection(remoteName).onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added"){
          const candidate = new RTCIceCandidate(change.doc.data)
          peerConn.addIceCandidate(candidate)
        }
      })
    })
  }

  // Create and send offer
  const createWormhole = async (peerConn, database) => {

    const offer = await peerConn.createOffer()
    await peerConn.setLocalDescription(offer)

    const roomWithOffer = {
      offer: {
        type: offer.type,
        sdp: offer.sdp
      }
    }

    // Add offer to firestore for signalling
    const roomRef = await database.collection("wormholes").add(roomWithOffer)
    const wormholeID = roomRef.id
    console.log("You're sending a file! Wormhole ID is: ", wormholeID)

    collectIceCandidates(roomRef, peerConn, "local", "remote")

    // Listen for answer
    roomRef.onSnapshot(async snapshot => {
      console.log("Updated room: ", snapshot.data())
      const data = snapshot.data()
      if (!peerConn.currentRemoteDescription && data.answer){
        console.log("Remote session description: ", data.answer)
        const answer = new RTCSessionDescription(data.answer)
        await peerConn.setRemoteDescription(answer)
      }
    })

  }

  useEffect(() => {

    const db = firebase.firestore()

    // peer connection listeners??

    createWormhole(pc, db)
    channel.onopen = (e) => console.log("Channel open")
    

  })

  return (
    <div>
      Hi
    </div>
  )
}

export default Send;
