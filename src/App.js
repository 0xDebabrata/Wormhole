import React from 'react'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useHistory
} from 'react-router-dom';
import Send from './screens/Send';
import firebase from './firebase';

import './App.css'
import './style/Home.css'

const App = () => {

  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <Home />
        </Route>
        <Route path="/send">
          <Send />
        </Route>
      </Switch>
    </Router>
  )
}


const Home = () => {

  const history = useHistory()

  // Navigate to send address
  const handleClick = () => {
    history.push("/send")
  }

  // Handle join room click
  const joinRoom = async () => {
    const wormholeID = document.getElementById("id-inp").value
    await enterWormhole(wormholeID)
  }

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

  // Enter wormhole
  const enterWormhole = async (id) => {

    const config = {
      iceServers: [{
        urls: ["stun:stun.l.google.com:19302", "stun:stun2.l.google.com:19302"]
      }],
      iceCandidatePoolSize: 10,
    }

    const db = firebase.firestore()
    const roomRef = db.collection("wormholes").doc(id)
    const roomSnapshot = await roomRef.get()

    if (roomSnapshot.exists) {
      const pc = new RTCPeerConnection(config)
      pc.ondatachannel = (e) => console.log(e)

      // peer connection listeners??

      const offer = roomSnapshot.data().offer
      await pc.setRemoteDescription(offer)

      collectIceCandidates(roomRef, pc, "local", "remote")

      // Create answer and update db
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      const roomWithAnswer = {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        }
      }

      await roomRef.update(roomWithAnswer)

    } else {
      alert("Wormhole does not exist. Please make sure you hava entered the correct ID.")
    }
  }

  return(
    <div>
      <button onClick={handleClick}>Create wormhole</button>
      <br />
      <input id="id-inp" type="text" placeholder="Enter wormhole ID"></input>
      <button onClick={joinRoom}>Enter wormhole</button>
    </div>
  )
}

export default App
