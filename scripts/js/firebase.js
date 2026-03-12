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
            document.getElementById('logout-btn').classList.remove('hidden');

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
            generateIsland(currentIsland);

            startSync();
            initSocial();
            loadFriends(user.uid);
        } else {
            multiplayer.userId = null;
            multiplayer.username = "";
            document.getElementById('auth-menu').classList.remove('hidden');
            document.getElementById('logout-btn').classList.add('hidden');
            skinMenu.classList.add('hidden');
            gameState = 'intro';
        }
    });

    // Configuración del botón de Cerrar sesión
    document.getElementById('logout-btn').addEventListener('click', () => {
        fb.signOut(auth).then(() => {
            window.location.reload(); // Recarga la página para empezar de cero
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

        for (let uid in data) {
            if (uid === multiplayer.userId) continue;

            const pData = data[uid];
            // Solo ver a los que están en la misma isla
            if (pData.island !== currentIsland) {
                if (multiplayer.players[uid]) delete multiplayer.players[uid];
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
            }
        }
    });

    // Desconectar
    const myRef = fb.ref(db, `players/${multiplayer.userId}`);
    fb.onDisconnect(myRef).remove();
}

function sendMovement() {
    if (!multiplayer.userId || gameState !== 'playing') return;

    // Configuración de intervalos
    const NORMAL_INTERVAL = 500;   // 0.5s (con gente cerca)
    const IDLE_INTERVAL = 5000;    // 5s (solo o lejos)
    const NEAR_DISTANCE = 1200;    // Radio de "cercanía"

    // Determinar si hay alguien cerca
    let anyoneNear = false;
    for (let uid in multiplayer.players) {
        const p = multiplayer.players[uid];
        const dist = Math.sqrt(Math.pow(p.x - player.x, 2) + Math.pow(p.y - player.y, 2));
        if (dist < NEAR_DISTANCE) {
            anyoneNear = true;
            break;
        }
    }

    const currentInterval = (anyoneNear && Object.keys(multiplayer.players).length > 0) ? NORMAL_INTERVAL : IDLE_INTERVAL;

    const now = performance.now();
    if (now - multiplayer.lastSend < currentInterval) return;

    multiplayer.lastSend = now;
    const myRef = fb.ref(db, `players/${multiplayer.userId}`);
    fb.update(myRef, {
        x: player.x,
        y: player.y,
        direction: player.direction,
        isMoving: player.isMoving,
        username: multiplayer.username,
        skin: skinColor,
        island: currentIsland,
        status: multiplayer.status
    });
}

