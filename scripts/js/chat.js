let peer;
let localStream;
const peerConnections = {};

function initChat() {
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const text = chatInput.value.trim();
            if (text) {
                sendChatMessage(text);
                chatInput.value = '';
            }
        }
    });

    // Botón de activación manual
    const activateBtn = document.getElementById('activate-voice-btn');
    activateBtn.onclick = () => {
        initVoiceChat();
        activateBtn.classList.add('hidden');
        document.getElementById('voice-controls').classList.remove('hidden');
    };
}

function initVoiceChat() {
    peer = new Peer();

    peer.on('open', (id) => {
        console.log('Mi Peer ID es: ' + id);
        multiplayer.peerId = id;
    });

    peer.on('call', (call) => {
        const callerUid = call.metadata.uid;
        if (multiplayer.friends.includes(callerUid)) {
            if (localStream) {
                call.answer(localStream);
                setupVoiceCall(call);
            }
        }
    });

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        localStream = stream;
        
        // Mute toggle
        const muteBtn = document.getElementById('mute-voice-btn');
        muteBtn.onclick = () => {
            const audioTrack = localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            muteBtn.innerText = audioTrack.enabled ? 'Mute' : 'Unmute';
            muteBtn.classList.toggle('muted', !audioTrack.enabled);
        };

        // Analizador para ondas
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 64;
        source.connect(analyzer);
        
        const data = new Uint8Array(analyzer.frequencyBinCount);
        const waveCanvas = document.getElementById('voice-waves');
        const wCtx = waveCanvas.getContext('2d');

        function drawWaves() {
            analyzer.getByteFrequencyData(data);
            wCtx.clearRect(0,0, waveCanvas.width, waveCanvas.height);
            wCtx.fillStyle = '#ffb58b';
            
            let sum = 0;
            const sliceWidth = waveCanvas.width / data.length;
            for(let i=0; i<data.length; i++) {
                const v = data[i] / 128.0;
                const h = v * waveCanvas.height / 2;
                wCtx.fillRect(i * sliceWidth, waveCanvas.height - h, sliceWidth - 1, h);
                sum += data[i];
            }

            const avg = sum / data.length;
            const indicator = document.getElementById('voice-indicator');
            if (avg > 15 && localStream.getAudioTracks()[0].enabled) {
                indicator.classList.add('talking');
                player.isTalking = true;
            } else {
                indicator.classList.remove('talking');
                player.isTalking = false;
            }
            requestAnimationFrame(drawWaves);
        }
        drawWaves();

    }).catch(err => {
        console.warn("Sin acceso al micro:", err);
        document.getElementById('voice-indicator').innerText = '🎤 Voz: Error';
    });
}

function sendChatMessage(text) {
    if (!multiplayer.userId) return;
    
    const chatRef = fb.ref(db, `chats/${getIslandKey()}`);
    const newMsgRef = fb.push(chatRef);
    fb.set(newMsgRef, {
        uid: multiplayer.userId,
        username: multiplayer.username,
        text: text,
        timestamp: Date.now()
    });

    // Mostrar localmente de inmediato (opcional, Firebase onValue lo hará)
}

function setupVoiceCall(call) {
    const remoteUid = call.metadata.uid;
    call.on('stream', (remoteStream) => {
        if (!peerConnections[remoteUid]) {
            const audio = new Audio();
            audio.srcObject = remoteStream;
            audio.play();
            peerConnections[remoteUid] = { call, audio };
        }
    });
    call.on('close', () => {
        if (peerConnections[remoteUid]) {
            peerConnections[remoteUid].audio.pause();
            delete peerConnections[remoteUid];
        }
    });
}

// Se llama desde firebase.js cuando recibimos datos de otros jugadores
function handleVoiceP2P(uid, pData) {
    if (!localStream || !peer || !multiplayer.peerId) return;
    if (!multiplayer.friends.includes(uid)) return; // Solo con amigos

    // Si el otro tiene peerId y nosotros no estamos conectados con él
    if (pData.peerId && !peerConnections[uid]) {
        // Solo llamamos si somos el "menor" ID para evitar dobles llamadas
        if (multiplayer.userId < uid) {
            console.log("Llamando a " + pData.username);
            const call = peer.call(pData.peerId, localStream, {
                metadata: { uid: multiplayer.userId }
            });
            if (call) setupVoiceCall(call);
        }
    }
}

function displayChatMessage(msg) {
    const chatMessages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<b>${msg.username}:</b> ${msg.text}`;
    chatMessages.appendChild(div);
    
    // Auto scroll si está cerca del final
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Guardar en el objeto del jugador para el dibujo sobre la cabeza
    if (multiplayer.players[msg.uid]) {
        multiplayer.players[msg.uid].lastMsg = msg.text;
        multiplayer.players[msg.uid].msgTime = Date.now();
    } else if (msg.uid === multiplayer.userId) {
        player.lastMsg = msg.text;
        player.msgTime = Date.now();
    }
}

// Listener global de chat iniciado desde firebase.js al entrar en una isla
let currentChatUnsubscribe = null;
function listenToIslandChat() {
    if (currentChatUnsubscribe) fb.off(currentChatUnsubscribe);
    
    const chatRef = fb.ref(db, `chats/${getIslandKey()}`);
    // Solo mensajes nuevos (usamos un timestamp)
    const startTime = Date.now();
    
    currentChatUnsubscribe = fb.onChildAdded(chatRef, (snapshot) => {
        const msg = snapshot.val();
        if (msg.timestamp >= startTime - 1000) {
            displayChatMessage(msg);
        }
    });
}
