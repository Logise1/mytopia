// --- FIREBASE INIT ---
let app, auth, db, fs;

async function initFirebase() {
    const { fb } = window;
    app = fb.initializeApp(window.firebaseConfig);
    auth = fb.getAuth(app);
    db = fb.getDatabase(app);
    fs = fb.getFirestore(app);

    setupAuthListeners();

    // Persistencia de sesión
    fb.onAuthStateChanged(auth, async (user) => {
        if (user) {
            multiplayer.userId = user.uid;
            // Si el nombre no está definido o es string vacío, intentamos sacar el principio del email
            let name = user.displayName;
            if (!name && user.email) name = user.email.split('@')[0];
            multiplayer.username = name || 'Jugador';

            document.getElementById('auth-menu').classList.add('hidden');
            document.getElementById('settings-btn').classList.remove('hidden');

            // Intentar recuperar el color guardado previamente
            let skinLoaded = false;
            try {
                const docSnap = await fb.getDoc(fb.doc(fs, "users", user.uid));
                if (docSnap.exists() && docSnap.data().skin) {
                    skinColor = docSnap.data().skin;
                    if (tileAssets && tileAssets.isLoaded) {
                        getSkinAnimations(skinColor);
                        getFakerSkinAnimations(skinColor);
                    }
                    skinLoaded = true;
                }
            } catch (e) { }

            if (skinLoaded) {
                skinMenu.classList.add('hidden');
                gameState = 'playing';
            } else {
                skinMenu.classList.remove('hidden');
                gameState = 'customizing';
            }
            
            // Generar la isla actual usando la semilla del usuario o tipo correcto
            multiplayer.currentIslandOwnerUid = user.uid; // Por defecto al loguear es nuestra casa
            generateIsland(currentIsland);

            startSync();
            initSocial();
            loadFriends(user.uid);
            initChat();
            listenToIslandChat();
        } else {
            multiplayer.userId = null;
            multiplayer.username = "";
            document.getElementById('auth-menu').classList.remove('hidden');
            document.getElementById('settings-btn').classList.add('hidden');
            document.getElementById('settings-menu').classList.add('hidden');
            skinMenu.classList.add('hidden');
            gameState = 'intro';
        }
    });

    // Configuración del botón de Cerrar sesión
    document.getElementById('logout-inner-btn').addEventListener('click', () => {
        fb.signOut(auth).then(() => {
            window.location.reload(); 
        });
    });

    // Toggle de Ajustes
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-menu').classList.toggle('hidden');
    });

    document.getElementById('close-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-menu').classList.add('hidden');
    });

    // Lógica de cambio de SKIN en Ajustes
    document.querySelectorAll('.skin-color-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const color = e.target.dataset.color;
            skinColor = color;
            
            // Visual update
            getSkinAnimations(skinColor);
            getFakerSkinAnimations(skinColor);
            
            // Mark selected
            document.querySelector('.skin-color-btn.selected')?.classList.remove('selected');
            e.target.classList.add('selected');

            // Save to Firebase
            if (multiplayer.userId) {
                try {
                    await fb.setDoc(fb.doc(fs, "users", multiplayer.userId), {
                        skin: skinColor
                    }, { merge: true });
                } catch(err) { console.error("Error saving skin:", err); }
            }
        });
    });
}

function setupAuthListeners() {
    const authBtn = document.getElementById('auth-action-btn');
    const toggleBtn = document.getElementById('toggle-auth');
    const userField = document.getElementById('username');
    const passField = document.getElementById('password');
    const authError = document.getElementById('auth-error');
    let isRegister = false;

    toggleBtn.onclick = () => {
        isRegister = !isRegister;
        authBtn.innerText = isRegister ? 'Registrarse' : 'Entrar';
        toggleBtn.innerText = isRegister ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Regístrate';
    };

    authBtn.onclick = async () => {
        const username = userField.value.trim();
        const password = passField.value;
        const email = `${username}@mytop.ia`;

        if (!username || !password) {
            authError.innerText = "Error: Username y Password obligatorios";
            return;
        }

        try {
            if (isRegister) {
                const cred = await fb.createUserWithEmailAndPassword(auth, email, password);
                await fb.updateProfile(cred.user, { displayName: username });
                await fb.setDoc(fb.doc(fs, "users", cred.user.uid), {
                    username: username,
                    skin: skinColor,
                    createdAt: Date.now()
                });
            } else {
                await fb.signInWithEmailAndPassword(auth, email, password);
            }
            // El cambio de UI y startSync() ahora los maneja onAuthStateChanged
        } catch (e) {
            authError.innerText = "Error: " + e.message;
        }
    };
}

function startSync() {
    const playersRef = fb.ref(db, 'players');

    // Escuchar a otros
    fb.onValue(playersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Limpiar jugadores que ya no están en la base de datos
        for (let uid in multiplayer.players) {
            if (!data[uid]) {
                // Parar audio si existía
                if (multiplayer.players[uid].activeAudio) {
                    multiplayer.players[uid].activeAudio.pause();
                    multiplayer.players[uid].activeAudio = null;
                }
                delete multiplayer.players[uid];
            }
        }

        for (let uid in data) {
            if (uid === multiplayer.userId) continue;

            const pData = data[uid];
            // Solo ver a los que están EXACTAMENTE en la misma instancia de isla
            // Solo islas privadas (home/_inside) llevan el UID del dueño
            const myIslandKey = getIslandKey();
            if (pData.island !== myIslandKey) {
                if (multiplayer.players[uid]) {
                    if (multiplayer.players[uid].activeAudio) {
                        multiplayer.players[uid].activeAudio.pause();
                        multiplayer.players[uid].activeAudio = null;
                    }
                    delete multiplayer.players[uid];
                }
                continue;
            }

            if (!multiplayer.players[uid]) {
                multiplayer.players[uid] = {
                    x: pData.x, y: pData.y,
                    targetX: pData.x, targetY: pData.y,
                    username: pData.username,
                    skin: pData.skin || '#ffdbac',
                    direction: pData.direction || 'forward',
                    isMoving: pData.isMoving || false,
                    frame: 0
                };
            } else {
                // Interpolación
                multiplayer.players[uid].targetX = pData.x;
                multiplayer.players[uid].targetY = pData.y;
                multiplayer.players[uid].direction = pData.direction;
                multiplayer.players[uid].isMoving = pData.isMoving;
                multiplayer.players[uid].skin = pData.skin;
                if (pData.username) multiplayer.players[uid].username = pData.username;
                
                // Sincronizar emote
                const wasEmoting = multiplayer.players[uid].emoteActive || false;
                multiplayer.players[uid].emoteActive = pData.emoteActive || false;
                multiplayer.players[uid].emoteFrame = pData.emoteFrame || 0;
                multiplayer.players[uid].emoteType = pData.emoteType || 1;
                
                // Chat y Voz
                multiplayer.players[uid].peerId = pData.peerId || null;
                multiplayer.players[uid].isTalking = pData.isTalking || false;
                handleVoiceP2P(uid, pData);
                
                // Audio perfecto sincronizado
                if (!wasEmoting && pData.emoteActive) {
                    // Iniciar audio dinámico según el tipo de emote
                    const soundPath = `sprites/characters/emotes/${pData.emoteType || 1}/1.wav`;
                    if (!multiplayer.players[uid].activeAudio) {
                        multiplayer.players[uid].activeAudio = new Audio(soundPath);
                    } else {
                        multiplayer.players[uid].activeAudio.src = soundPath;
                    }
                    multiplayer.players[uid].activeAudio.volume = sfxVolume;
                    multiplayer.players[uid].activeAudio.currentTime = 0;
                    multiplayer.players[uid].activeAudio.play().catch(e => {});
                } 
                
                // Parar audio SOLO si el jugador se mueve (cancela el baile)
                if (pData.isMoving && multiplayer.players[uid].activeAudio) {
                    multiplayer.players[uid].activeAudio.pause();
                    multiplayer.players[uid].activeAudio.currentTime = 0;
                }
            }
        }
    });

    // Desconectar
    const myRef = fb.ref(db, `players/${multiplayer.userId}`);
    fb.onDisconnect(myRef).remove();
}

function sendMovement() {
    if (!multiplayer.userId || gameState !== 'playing') return;

    // Configuración de intervalos (Reducidos para mayor suavidad)
    const NORMAL_INTERVAL = 150;
    const IDLE_INTERVAL = 500;
    const NEAR_DISTANCE = 1200;

    let anyoneNear = Object.keys(multiplayer.players).length > 0;
    for (let uid in multiplayer.players) {
        const p = multiplayer.players[uid];
        const dist = Math.sqrt(Math.pow(p.x - player.x, 2) + Math.pow(p.y - player.y, 2));
        if (dist < NEAR_DISTANCE) {
            anyoneNear = true;
            break;
        }
    }

    const currentInterval = anyoneNear ? NORMAL_INTERVAL : IDLE_INTERVAL;

    const now = performance.now();
    if (now - multiplayer.lastSend < currentInterval) return;

    multiplayer.lastSend = now;
    const myRef = fb.ref(db, `players/${multiplayer.userId}`);
    const myIslandKey = getIslandKey();
    fb.update(myRef, {
        x: player.x,
        y: player.y,
        direction: player.direction,
        isMoving: player.isMoving,
        username: multiplayer.username,
        skin: skinColor,
        island: myIslandKey,
        status: multiplayer.status,
        emoteActive: player.emote.active || false,
        emoteFrame: player.emote.frame || 0,
        emoteType: player.emote.type || 1,
        peerId: multiplayer.peerId || null,
        isTalking: player.isTalking || false
    });
}

// --- PERSISTENCIA DE MUEBLES Y ECONOMÍA ---
async function saveFurniture() {
    if (!multiplayer.userId) return;
    try {
        await fb.setDoc(fb.doc(fs, "furniture", multiplayer.userId), {
            items: homeFurniture,
            coins: coinCount,
            wallPhotoId: houseWallPhotoId
        });
    } catch (e) {
        console.error("Error salvando muebles:", e);
    }
}

async function loadFurniture(ownerUid) {
    homeFurniture = [];
    try {
        const docSnap = await fb.getDoc(fb.doc(fs, "furniture", ownerUid));
        if (docSnap.exists()) {
            homeFurniture = docSnap.data().items || [];
            houseWallPhotoId = docSnap.data().wallPhotoId || null;
            if (houseWallPhotoId) loadWallPhoto(houseWallPhotoId);
            else houseWallPhotoImage = null;

            if (ownerUid === multiplayer.userId) {
                coinCount = docSnap.data().coins || 500;
                document.getElementById('coin-count').innerText = coinCount;
            }
        }
    } catch (e) {
        console.error("Error cargando muebles:", e);
    }
}

// --- LÓGICA DE FOTOS PIXELADAS ---
async function uploadPhoto(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('https://greenbase.arielcapdevila.com/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            houseWallPhotoId = data.id;
            await loadWallPhoto(houseWallPhotoId);
            saveFurniture(); 
        } else {
            alert("Error al subir la foto.");
        }
    } catch (e) {
        console.error('Error uploading photo:', e);
    }
}

async function loadWallPhoto(id) {
    if (!id) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://greenbase.arielcapdevila.com/file/${id}`;
    img.onload = () => {
        houseWallPhotoImage = pixelateImage(img, 4); 
    };
}

function pixelateImage(image, pixelSize) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = image.width;
    const h = image.height;
    
    const sw = Math.ceil(w / pixelSize);
    const sh = Math.ceil(h / pixelSize);
    canvas.width = sw;
    canvas.height = sh;
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, sw, sh);
    return canvas;
}

