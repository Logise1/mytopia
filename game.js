const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('game-container');
const skinMenu = document.getElementById('skin-menu');
const startBtn = document.getElementById('start-game');
const tileSpriteImg = document.getElementById('tile-sprite');

// Configuración de canvas
canvas.width = 800;
canvas.height = 600;

// Estado del juego
let gameState = 'intro';
let skinColor = '#ffdbac';
let mouseX = 0;
let mouseY = 0;

// Stats del Jugador
const stats = {
    energy: 100,
    mood: 1,
    health: 100
};

// Mundo y Tiempo
let worldTime = 12; // De 0 a 24 (12 = mediodía)
const dayNightColors = {
    night: { r: 5, g: 5, b: 40, a: 0.6 }, // Azul oscuro traslúcido
    day: { r: 0, g: 0, b: 0, a: 0 }
};

// Modo Debug
const debug = {
    active: false,
    panel: null
};

// Assets HUD
const hudAssets = {
    back: new Image(),
    front: new Image(),
    heartDay: new Image(),
    heartNight: new Image(),
    life: new Image(),
    tablon: new Image(),
    pupil: new Image(),
    isLoaded: false
};

// Delta Time
let lastTime = performance.now();
let deltaTime = 0;

// Personaje y Animaciones
const player = {
    x: 0, // Posición en el mundo
    y: 0,
    vx: 0, // Velocidad actual en X
    vy: 0, // Velocidad actual en Y
    speed: 1800, // Aceleración aumentada
    maxSpeed: 500, // Velocidad máxima aumentada
    friction: 0.9, // Cuanto más bajo, más rápido frena
    width: 64,
    height: 64,
    direction: 'forward',
    isMoving: false,
    frame: 0,
    frameTimer: 0,
    frameDuration: 0.1, // segundos por frame
    animations: {
        forward: [],
        up: [],
        left: [],
        right: []
    }
};

// Cámara (seguirá al personaje)
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
};

const directions = ['forward', 'up', 'left', 'right'];
const totalFrames = 6;

// Teclas
const keys = {};

// Assets Suelo
const tileAssets = {
    grass: new Image(),
    sand: new Image(),
    'grass-sand-up': new Image(),
    'grass-sand-down': new Image(),
    'grass-sand-left': new Image(),
    'grass-sand-right': new Image(),
    'grass-sand-diagonal': new Image(),
    isLoaded: false
};

const mapSize = 100;
const mapData = [];

// Multiplayer
const multiplayer = {
    players: {}, // Otros jugadores
    userId: null,
    username: "",
    lastSend: 0,
    sendInterval: 500, // 0.5s entre ráfagas
    moveBuffer: [] // Acumular movimientos para enviar
};

// --- FIREBASE INIT ---
let app, auth, db, fs;

async function initFirebase() {
    const { fb } = window;
    app = fb.initializeApp(window.firebaseConfig);
    auth = fb.getAuth(app);
    db = fb.getDatabase(app);
    fs = fb.getFirestore(app);

    setupAuthListeners();
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
        const email = `${username}@mytop.ia`; // Email interno secreto

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
            
            multiplayer.userId = auth.currentUser.uid;
            multiplayer.username = username || auth.currentUser.displayName;
            
            document.getElementById('auth-menu').classList.add('hidden');
            skinMenu.classList.remove('hidden');
            gameState = 'customizing';
            
            startSync();
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
            
            if (!multiplayer.players[uid]) {
                multiplayer.players[uid] = { 
                    x: data[uid].x, y: data[uid].y, 
                    targetX: data[uid].x, targetY: data[uid].y,
                    username: data[uid].username,
                    skin: data[uid].skin || '#ffdbac',
                    direction: data[uid].direction || 'forward',
                    isMoving: data[uid].isMoving || false,
                    frame: 0
                };
            } else {
                // Interpolación
                multiplayer.players[uid].targetX = data[uid].x;
                multiplayer.players[uid].targetY = data[uid].y;
                multiplayer.players[uid].direction = data[uid].direction;
                multiplayer.players[uid].isMoving = data[uid].isMoving;
                multiplayer.players[uid].skin = data[uid].skin;
            }
        }
    });

    // Desconectar
    const myRef = fb.ref(db, `players/${multiplayer.userId}`);
    fb.onDisconnect(myRef).remove();
}

function sendMovement() {
    if (!multiplayer.userId || gameState !== 'playing') return;
    
    // Solo enviar cada 0.5s como pidió el usuario (simulando ráfaga o límite)
    const now = performance.now();
    if (now - multiplayer.lastSend < multiplayer.sendInterval) return;
    
    multiplayer.lastSend = now;
    const myRef = fb.ref(db, `players/${multiplayer.userId}`);
    fb.update(myRef, {
        x: player.x,
        y: player.y,
        direction: player.direction,
        isMoving: player.isMoving,
        username: multiplayer.username,
        skin: skinColor
    });
}

// Inicialización
window.onload = async () => {
    // 1. Firebase primero
    await initFirebase();

    // 2. Generar isla
    const centerX = mapSize / 2;
    const centerY = mapSize / 2;
    const radius = 10;

    for (let y = 0; y < mapSize; y++) {
        mapData[y] = [];
        for (let x = 0; x < mapSize; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            
            if (Math.abs(dx) < radius && Math.abs(dy) < radius) {
                mapData[y][x] = 'grass';
            } else if (Math.abs(dx) === radius && Math.abs(dy) < radius) {
                mapData[y][x] = dx < 0 ? 'grass-sand-left' : 'grass-sand-right';
            } else if (Math.abs(dy) === radius && Math.abs(dx) < radius) {
                mapData[y][x] = dy < 0 ? 'grass-sand-up' : 'grass-sand-down';
            } else if (dx === -radius && dy === -radius) {
                mapData[y][x] = 'grass-sand-diagonal'; // Arriba Izquierda (TL)
            } else if (dx === radius && dy === -radius) {
                mapData[y][x] = 'grass-sand-diagonal_TR'; // Arriba Derecha
            } else if (dx === radius && dy === radius) {
                mapData[y][x] = 'grass-sand-diagonal_BR'; // Abajo Derecha
            } else if (dx === -radius && dy === radius) {
                mapData[y][x] = 'grass-sand-diagonal_BL'; // Abajo Izquierda
            } else {
                mapData[y][x] = 'sand';
            }
        }
    }

    // 1. Iniciamos zoom-in
    setTimeout(() => {
        container.classList.add('zoomed');
        // El skinMenu y el gameState = 'customizing' ahora ocurren DESPUÉS del login
    }, 500);

    // 2. Cargar Assets
    await Promise.all([
        loadAllAnimations(),
        loadHUDAssets(),
        loadTileAssets()
    ]);

    // Posicionar jugador en el centro de la isla
    player.x = centerX * 64;
    player.y = centerY * 64;

    // 3. Listeners
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // 4. Game loop
    requestAnimationFrame(gameLoop);
};

async function loadTileAssets() {
    const promises = [];
    const files = [
        'grass', 'sand', 
        'grass-sand-up', 'grass-sand-down', 'grass-sand-left', 'grass-sand-right',
        'grass-sand-diagonal'
    ];
    
    files.forEach(name => {
        // Usamos diagonal1 como la base para todas las rotaciones
        const fileName = name === 'grass-sand-diagonal' ? 'grass-sand-diagonal1' : name;
        tileAssets[name].src = `sprites/tiles/${fileName}.png`;
        promises.push(new Promise(res => tileAssets[name].onload = res));
    });
    
    await Promise.all(promises);
    tileAssets.isLoaded = true;
}

async function loadHUDAssets() {
    const promises = [];
    const files = {
        back: 'back.svg',
        front: 'front.svg',
        heartDay: 'heart-day.svg',
        heartNight: 'heart-night.svg',
        life: 'life-happyness.svg',
        tablon: 'selecciontablon.svg',
        pupil: 'pupila.svg'
    };

    for (const [key, filename] of Object.entries(files)) {
        hudAssets[key].src = `sprites/hud/${filename}`;
        promises.push(new Promise(res => hudAssets[key].onload = res));
    }

    await Promise.all(promises);
    hudAssets.isLoaded = true;
}

async function loadAllAnimations() {
    const loadPromises = [];

    for (const dir of directions) {
        for (let i = 1; i <= totalFrames; i++) {
            let filename = `walk-${dir}${i}.png`;
            if (dir === 'left' && i === 1) filename = 'walk-left.png';

            const promise = new Promise((resolve) => {
                const img = new Image();
                img.src = `sprites/characters/${filename}`;
                img.onload = () => {
                    player.animations[dir][i - 1] = {
                        original: img,
                        processed: null
                    };
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`No se pudo cargar: ${filename}`);
                    resolve();
                };
            });
            loadPromises.push(promise);
        }
    }

    await Promise.all(loadPromises);
    processAllAnimations(skinColor);
}

function processAllAnimations(color) {
    const targetColor = hexToRgb(color);

    for (const dir in player.animations) {
        player.animations[dir].forEach(frameData => {
            if (!frameData || !frameData.original) return;

            const img = frameData.original;
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;

            tempCtx.drawImage(img, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                if (a > 0 && g > r && g > b) {
                    const factor = g / 255;
                    data[i] = Math.floor(targetColor.r * factor);
                    data[i + 1] = Math.floor(targetColor.g * factor);
                    data[i + 2] = Math.floor(targetColor.b * factor);
                }
            }
            tempCtx.putImageData(imageData, 0, 0);
            frameData.processed = tempCanvas;
        });
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Selección de color
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelector('.color-btn.selected')?.classList.remove('selected');
        e.target.classList.add('selected');
        skinColor = e.target.dataset.color;
        processAllAnimations(skinColor);
    });
});

startBtn.addEventListener('click', () => {
    gameState = 'playing';
    skinMenu.classList.add('hidden');
});

function update(dt) {
    if (gameState !== 'playing' && gameState !== 'customizing') return;

    let ax = 0;
    let ay = 0;
    let inputMoving = false;

    // Aplicar aceleración basada en inputs
    if (keys['KeyW'] || keys['ArrowUp']) {
        ay = -player.speed;
        player.direction = 'up';
        inputMoving = true;
    } else if (keys['KeyS'] || keys['ArrowDown']) {
        ay = player.speed;
        player.direction = 'forward';
        inputMoving = true;
    }

    if (keys['KeyA'] || keys['ArrowLeft']) {
        ax = -player.speed;
        player.direction = 'left';
        inputMoving = true;
    } else if (keys['KeyD'] || keys['ArrowRight']) {
        ax = player.speed;
        player.direction = 'right';
        inputMoving = true;
    }

    // Normalizar aceleración diagonal
    if (ax !== 0 && ay !== 0) {
        const factor = 1 / Math.sqrt(2);
        ax *= factor;
        ay *= factor;
    }

    // Aplicar aceleración a la velocidad
    player.vx += ax * dt;
    player.vy += ay * dt;

    // Aplicar fricción (siempre, para frenar o limitar)
    // Usamos una fricción basada en deltaTime para que sea consistente
    const frictionFactor = Math.pow(player.friction, dt * 60);
    player.vx *= frictionFactor;
    player.vy *= frictionFactor;

    // Limitar velocidad máxima
    const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    if (currentSpeed > player.maxSpeed) {
        const ratio = player.maxSpeed / currentSpeed;
        player.vx *= ratio;
        player.vy *= ratio;
    }

    // Considerar parado si la velocidad es muy baja
    const minVel = 10;
    player.isMoving = (currentSpeed > minVel);

    // Mover personaje
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Actualizar Cámara de forma SUAVE (Lerp)
    const targetCamX = player.x - canvas.width / 2 + player.width / 2;
    const targetCamY = player.y - canvas.height / 2 + player.height / 2;
    
    // Si la cámara acaba de aparecer o está muy lejos, cortamos directamente
    if (Math.abs(targetCamX - camera.x) > 1000) {
        camera.x = targetCamX;
        camera.y = targetCamY;
    } else {
        camera.x += (targetCamX - camera.x) * 5 * dt;
        camera.y += (targetCamY - camera.y) * 5 * dt;
    }

    // Animación con DeltaTime
    if (player.isMoving) {
        player.frameTimer += dt;
        player.idleTime = 0;
        if (player.frameTimer > player.frameDuration) {
            player.frame = (player.frame + 1) % totalFrames;
            player.frameTimer = 0;
        }
    } else {
        player.frame = 0; // Primer frame como posición de reposo (Idle en 1)
        player.idleTime = (player.idleTime || 0) + dt;
    }
}

function drawTiles() {
    const tileSize = 64;

    const startX = Math.floor(camera.x / tileSize);
    const startY = Math.floor(camera.y / tileSize);
    const endX = startX + Math.ceil(canvas.width / tileSize) + 1;
    const endY = startY + Math.ceil(canvas.height / tileSize) + 1;

    for (let ty = startY; ty < endY; ty++) {
        for (let tx = startX; tx < endX; tx++) {
            const mx = ((tx % mapSize) + mapSize) % mapSize;
            const my = ((ty % mapSize) + mapSize) % mapSize;
            
            let tileType = mapData[my][mx];
            const drawX = tx * tileSize - camera.x;
            const drawY = ty * tileSize - camera.y;

            if (tileAssets.isLoaded) {
                let rotation = 0;
                let finalType = tileType;

                // Lógica de rotación para diagonales (giradas 180° extra por petición)
                if (tileType.startsWith('grass-sand-diagonal')) {
                    finalType = 'grass-sand-diagonal';
                    rotation = Math.PI; // Base (Top-Left) girada 180
                    if (tileType.endsWith('_TR')) rotation = Math.PI * 1.5; // Top-Right (+90)
                    if (tileType.endsWith('_BR')) rotation = 0;             // Bottom-Right (+180)
                    if (tileType.endsWith('_BL')) rotation = Math.PI * 0.5; // Bottom-Left (+270)
                }

                const img = tileAssets[finalType];
                if (rotation !== 0) {
                    ctx.save();
                    ctx.translate(drawX + tileSize / 2, drawY + tileSize / 2);
                    ctx.rotate(rotation);
                    ctx.drawImage(img, -tileSize / 2, -tileSize / 2, tileSize, tileSize);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, drawX, drawY, tileSize, tileSize);
                }
            } else {
                ctx.fillStyle = tileType.includes('grass') ? '#2d5a27' : '#d2b48c';
                ctx.fillRect(drawX, drawY, tileSize, tileSize);
            }
        }
    }
}

function drawPlayer() {
    const anim = player.animations[player.direction];
    const frameData = anim ? anim[player.frame] : null;

    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    let jumpOffset = 0;
    let scaleX = 1;
    let scaleY = 1;
    
    // Mantener relación de aspecto original
    let baseHeight = player.height;
    let baseWidth = player.width;

    if (frameData && frameData.original) {
        const aspect = frameData.original.width / frameData.original.height;
        baseWidth = baseHeight * aspect;
    }

    if (player.isMoving) {
        const cycleProgress = (player.frame + (player.frameTimer / player.frameDuration)) / 6;
        const bounce = Math.abs(Math.sin(cycleProgress * Math.PI * 2));
        
        jumpOffset = -bounce * 10; // Un poco menos de salto
        
        // Squash and Stretch más sutil
        const s = (bounce - 0.5) * 0.1; 
        scaleY = 1 + s;
        scaleX = 1 - s;
    } else {
        // Respiración suave en Idle (Squash & Stretch en reposo)
        const breath = Math.sin((player.idleTime || 0) * 3);
        scaleY = 1 + breath * 0.02; // Sube/baja un 2%
        scaleX = 1 - breath * 0.01; // Ensancha un 1% inverso
    }

    const drawW = baseWidth * scaleX;
    const drawH = baseHeight * scaleY;

    // Ajustar posición para que la base esté equilibrada
    const drawX = screenX + (player.width - drawW) / 2;
    const drawY = screenY + (player.height - drawH) + jumpOffset;

    // --- DIBUJAR SOMBRA ---
    ctx.save();
    ctx.globalAlpha = 0.25;
    const shadowColor = '#1a0d16'; // Color oscuro para la sombra
    
    if (frameData && frameData.processed) {
        // Crear silueta para la sombra
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frameData.processed.width;
        tempCanvas.height = frameData.processed.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(frameData.processed, 0, 0);
        tCtx.globalCompositeOperation = 'source-in';
        tCtx.fillStyle = shadowColor;
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Dibujamos la sombra desplazada y aplastada en el suelo
        const shadowOffsetW = drawW * 1.1;
        const shadowOffsetH = drawH * 0.3;
        ctx.drawImage(tempCanvas, drawX + 12, screenY + player.height - 10, shadowOffsetW, shadowOffsetH);
    } else {
        // Fallback círculo si no hay sprite
        ctx.fillStyle = shadowColor;
        ctx.beginPath();
        ctx.ellipse(screenX + player.width/2 + 8, screenY + player.height - 4, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // --- DIBUJAR PERSONAJE ---
    if (!frameData || !frameData.processed) {
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(screenX + player.width / 2, screenY + player.height / 2 + jumpOffset, 20 * scaleX, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frameData.processed, drawX, drawY, drawW, drawH);

    // Dibujar nombre local sobre la cabeza
    if (multiplayer.username) {
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText(multiplayer.username, screenX + player.width / 2, screenY - 10);
    }
}

let hudRotation = 0;
let hudRotationTarget = 0;

function drawHUD() {
    if (!hudAssets.isLoaded) return;

    // 1. Icono Corazón (Agrandado: 60x60)
    // Cambia sprite según la hora (noche entre las 20:00 y las 6:00)
    const isNight = worldTime >= 20 || worldTime <= 6;
    const heartImg = isNight ? hudAssets.heartNight : hudAssets.heartDay;
    ctx.drawImage(heartImg, 15, 12, 60, 60);

    // 2. Barra de Vida Triple Borde
    const barX = 85; // Desplazada por el corazón más grande
    const barY = 25;
    const barW = 200;
    const barH = 30;
    
    // Borde Exterior Oscuro (5d3350)
    ctx.fillStyle = '#5d3350';
    ctx.fillRect(barX, barY, barW, barH);

    // Borde Medio Claro (ffb58b) - Grosor de 3px
    ctx.fillStyle = '#ffb58b';
    ctx.fillRect(barX + 2, barY + 2, barW - 4, barH - 4);

    // Fondo Interior Oscuro (5d3350) - Grosor de 6px total desde fuera
    ctx.fillStyle = '#5d3350';
    ctx.fillRect(barX + 5, barY + 5, barW - 10, barH - 10);

    // Progreso (e240af)
    const progressW = (stats.energy / 100) * (barW - 10);
    if (progressW > 0) {
        ctx.fillStyle = '#e240af';
        ctx.fillRect(barX + 5, barY + 5, progressW, barH - 10);
    }

    // 3. (Tablón ahora en CSS)
    
    // Muestra de Debug si está activo
    if (debug.active) {
        drawDebugInfo();
    }
}

function drawSinglePupil(ex, ey, pupilSize) {
    if (!hudAssets.pupil.complete) return;

    const dx = mouseX - ex;
    const dy = mouseY - ey;
    const angle = Math.atan2(dy, dx);
    const maxMove = pupilSize * 0.4; // Reducido para que no se mueva tanto
    const dist = Math.min(maxMove, Math.hypot(dx, dy) / 25); // Movimiento más corto y sutil
    
    const pupX = ex + Math.cos(angle) * dist;
    const pupY = ey + Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(pupX, pupY);
    // La pupila también vibra un poco de forma independiente
    ctx.rotate(Math.sin(performance.now() * 0.01) * 0.1);
    ctx.drawImage(hudAssets.pupil, -pupilSize / 2, -pupilSize / 2, pupilSize, pupilSize);
    ctx.restore();
}

function gameLoop(currentTime) {
    deltaTime = (currentTime - lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1;
    lastTime = currentTime;

    update(deltaTime);
    
    // Efecto de movimiento/giro aleatorio de vez en cuando
    if (Math.random() < 0.01) {
        hudRotationTarget = (Math.random() - 0.5) * 0.05; // Pequeño giro
    }
    if (Math.random() < 0.005) {
        hudRotationTarget = 0; // Vuelve al centro
    }
    
    if (gameState === 'playing') {
        if (player.isMoving) {
            stats.energy -= 5 * deltaTime;
        } else {
            stats.energy += 2 * deltaTime;
        }
        stats.energy = Math.max(0, Math.min(100, stats.energy));
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTiles();
    
    // Dibujar otros jugadores
    drawOtherPlayers();
    
    drawPlayer();

    // Sincronizar movimiento con Firebase (8fps aprox / 0.5s packets)
    sendMovement();

    // --- EFECTO DÍA/NOCHE (Overlay de oscuridad) ---
    applyDayNightEffect();

    drawHUD();

    if (debug.active) updateDebugPanel();

    requestAnimationFrame(gameLoop);
}

function drawOtherPlayers() {
    for (let uid in multiplayer.players) {
        const p = multiplayer.players[uid];
        
        // Lerp para suavizado (8fps a 60fps)
        p.x += (p.targetX - p.x) * 0.1;
        p.y += (p.targetY - p.y) * 0.1;

        const screenX = p.x - camera.x;
        const screenY = p.y - camera.y;

        // Solo dibujar si está en pantalla
        if (screenX < -100 || screenX > canvas.width + 100 || screenY < -100 || screenY > canvas.height + 100) continue;

        // Dibujar nombre
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText(p.username, screenX + player.width / 2, screenY - 10);

        // Dibujar sprite (usamos la misma lógica que drawPlayer pero simplificada)
        const anim = player.animations[p.direction];
        const frameData = anim ? anim[p.frame] : null;

        if (frameData && frameData.processed) {
            ctx.drawImage(frameData.processed, screenX, screenY, player.width, player.height);
        } else {
            ctx.fillStyle = p.skin;
            ctx.beginPath();
            ctx.arc(screenX + player.width / 2, screenY + player.height / 2, 20, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Animación simple para otros
        if (p.isMoving) {
            p.frame = (p.frame + 0.1) % totalFrames;
        } else {
            p.frame = 0;
        }
    }
}

function applyDayNightEffect() {
    let opacity = 0;
    
    // Curva de oscuridad: 0 (día) a 0.6 (noche cerrada)
    // Atardecer: 18:00 a 21:00, Amanecer: 05:00 a 08:00
    if (worldTime >= 18 && worldTime <= 21) {
        opacity = ((worldTime - 18) / 3) * 0.6;
    } else if (worldTime > 21 || worldTime < 5) {
        opacity = 0.6;
    } else if (worldTime >= 5 && worldTime <= 8) {
        opacity = (1 - (worldTime - 5) / 3) * 0.6;
    }

    if (opacity > 0) {
        ctx.fillStyle = `rgba(5, 5, 40, ${opacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// --- SISTEMA DE DEBUG ---
function toggleDebug() {
    debug.active = !debug.active;
    if (debug.active) {
        if (!debug.panel) createDebugPanel();
        debug.panel.style.display = 'block';
    } else if (debug.panel) {
        debug.panel.style.display = 'none';
    }
}

function createDebugPanel() {
    debug.panel = document.createElement('div');
    debug.panel.id = 'debug-panel';
    debug.panel.style.cssText = `
        position: absolute; top: 10px; right: 10px;
        background: rgba(0,0,0,0.8); color: #0f0;
        padding: 10px; font-family: monospace; font-size: 12px;
        border: 1px solid #0f0; border-radius: 5px; z-index: 1000;
        pointer-events: auto;
    `;
    
    const controls = [
        { label: 'Aceleración', key: 'speed', min: 0, max: 5000, step: 100 },
        { label: 'Vel Máx', key: 'maxSpeed', min: 0, max: 2000, step: 50 },
        { label: 'Fricción', key: 'friction', min: 0.1, max: 1, step: 0.01 },
        { label: 'Energía', key: 'energy', min: 0, max: 100, step: 1, obj: stats },
        { label: 'Hora del día', key: 'worldTime', min: 0, max: 24, step: 0.1, obj: window }
    ];

    controls.forEach(c => {
        const div = document.createElement('div');
        div.style.marginBottom = '5px';
        
        let initialVal;
        if (c.key === 'worldTime') initialVal = worldTime;
        else initialVal = (c.obj || player)[c.key];

        div.innerHTML = `
            <label>${c.label}: <span id="val-${c.key}">${initialVal}</span></label><br>
            <input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${initialVal}" 
                   oninput="window.updateDebugValue('${c.key}', this.value, '${c.label}')">
        `;
        debug.panel.appendChild(div);
    });

    document.body.appendChild(debug.panel);
    
    window.updateDebugValue = (key, val, label) => {
        const value = parseFloat(val);
        if (key === 'worldTime') worldTime = value;
        else if (label === 'Energía') stats[key] = value;
        else player[key] = value;
        document.getElementById(`val-${key}`).innerText = val;
    };
}

function updateDebugPanel() {
    // Info adicional que solo se lee
    if (debug.active) {
        // Podríamos añadir FPS aquí
    }
}

function drawDebugInfo() {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.font = '12px monospace';
    ctx.fillText(`Cam X: ${camera.x.toFixed(0)} Y: ${camera.y.toFixed(0)}`, 10, canvas.height - 20);
    ctx.fillText(`Pos X: ${player.x.toFixed(0)} Y: ${player.y.toFixed(0)}`, 10, canvas.height - 40);
    ctx.fillText(`Vel X: ${player.vx.toFixed(0)} Y: ${player.vy.toFixed(0)}`, 10, canvas.height - 60);
}

// Añadir tecla 'P' para debug (antes F3)
window.addEventListener('keydown', e => {
    if (e.code === 'KeyP') {
        e.preventDefault();
        toggleDebug();
    }
});
