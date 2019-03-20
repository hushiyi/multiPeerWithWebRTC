// 'use strict';
var isChannelReady = false;
var isStarted = false;
var isCreater = false;
var numClientsIndex = 0 ;
var localStream;
var pc;
var remoteStream;
var turnReady;
var anwerId;
var offerId;
var pcState;
var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var room = 'foo';
// Could prompt for room name:
// room = prompt('Enter room name:');

var socket = io.connect();

if (room !== '') {
  socket.emit('create or join', room);
  // console.log('Attempted to create or  join room', room);
}

socket.on('created', function(createId) {
  // 自己看到的
  isCreater = true;
  offerId = createId //第一个人
});

socket.on('full', function(room) {
  // console.log('Room ' + room + ' is full');
});

socket.on('join', function (newOneId){
  // 别人看到的
  console.log('Another peer made a request to join room ' + room+"---newOneId:"+newOneId);
  if (!isCreater) {
    offerId = anwerId
  };
  anwerId = newOneId ;
  isStarted = false
  isChannelReady = true;
});

socket.on('joined', function(room,newOneId,numClients) {
    // 自己看到的
    numClientsIndex = numClients
    anwerId = newOneId  //保存起来，下一个进来的人使用
    console.log('i come in to room: ' + newOneId+"---numClients:"+numClients);
    isChannelReady = true;

});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

// This client receives a message
socket.on('message',  function(message) {
    debugger
    console.log('Client received message<<<<<<<<<---------:', message);
    if (message === 'got user media') {
      maybeStart();
    } else if (message.type === 'offer') {
      offerId = message.offerId || ''
      // this.innerOfferId = offerId
      console.log("1111111111 offerId: ",offerId)
      if (numClientsIndex) {
        maybeStart.bind(this)(true);
      }
      numClientsIndex--
      pc.setRemoteDescription(new RTCSessionDescription(message));
      doAnswer(offerId);
    } else if (message.type === 'answer' && isStarted) {
       pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted ) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
       pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
      handleRemoteHangup();
    }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

// begin
// (async ()=> {
//   let stream = await navigator.mediaDevices.getUserMedia({ audio: false,video: true })
//   gotStream(stream)
// })()

navigator.mediaDevices.getUserMedia({
  audio: false,
  video: true
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});


function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
}

function sendMessage(message,anwerId,offerId) {
  // console.log('Client sending message----------->: '+message+'id:--------->'+id);
  socket.emit('message', message,anwerId,offerId);
}
var constraints = {
  video: true
};

if (location.hostname !== 'localhost') {
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function  maybeStart(isAnswer) {
  // console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (typeof localStream !== 'undefined' && isChannelReady) {
    console.log("2222222222   ",this)
    createPeerConnection.bind(this)(isAnswer);
    pc.addStream(localStream);
    isStarted = true;
    if (!numClientsIndex) {
      doCall(offerId);
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection(isAnswer) {
  try {
    pc = new RTCPeerConnection(null);
    if (isAnswer) {
      // console.log("3333333333   ",this.innerOfferId)
      console.log("3333333333  offerId ",offerId)

      // pc.onicecandidate = handleIceCandidateAnswer.bind(this.innerOfferId);
      pc.onicecandidate = handleIceCandidateAnswer.bind(offerId);

    }else{
      pc.onicecandidate = handleIceCandidate.bind(this);
    }
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    // console.log('Created RTCPeerConnnection');
  } catch (e) {
    // console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function  handleIceCandidate(event) {
  // console.log('icecandidate event: ', event);
  debugger
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    // },anwerId,this.innerOfferId);
    },anwerId,offerId);

  } else {
  }
}

function  handleIceCandidateAnswer(event) {
  debugger
  // console.log('icecandidate event: ', event);
  console.log("444444444444 ",this)
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    },this,anwerId);
  } else {
  }
}

function handleCreateOfferError(event) {
  // console.log('createOffer() error: ', event);
}

function doCall() {
  // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  pc.createAnswer().then(
    setLocalAndSendMessageForAnswer,
    onCreateSessionDescriptionError
  );
}
function setLocalAndSendMessageForAnswer(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage', sessionDescription);
  sendMessage(sessionDescription,offerId,anwerId);
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage ', sessionDescription);
  sendMessage(sessionDescription,anwerId,offerId);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  
  remoteStream = event.stream;
  var videoDom = document.createElement("video")
  videoDom.srcObject = remoteStream
  videoDom.autoplay = true;
  videoDom.playsinline = true;
  videos.appendChild(videoDom)
}

function handleRemoteStreamRemoved(event) {
  // console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  // console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  // console.log('Session terminated.');
  stop();
}

function stop() {
  isStarted = false;
  // pc.close();
  pc = null;
}
