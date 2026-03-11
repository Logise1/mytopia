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
    mood: 1, // Basado en HUD 1-8
    health: 100
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
    'grass-sand-diagonal1': new Image(),
    'grass-sand-diagonal2': new Image(),
    'grass-sand-diagonal3': new Image(),
    isLoaded: false
};

const mapSize = 100; // Mapa más grande para la isla
const mapData = [];

// Inicialización
window.onload = async () => {
    // Generar isla de grass centrada en (50, 50) con transición a sand
    const centerX = mapSize / 2;
    const centerY = mapSize / 2;
    const radius = 10;

    for (let y = 0; y < mapSize; y++) {
        mapData[y] = [];
        for (let x = 0; x < mapSize; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            
            // Lógica de transición de isla cuadrada
            if (Math.abs(dx) < radius && Math.abs(dy) < radius) {
                mapData[y][x] = 'grass';
            } else if (Math.abs(dx) === radius && Math.abs(dy) < radius) {
                mapData[y][x] = dx < 0 ? 'grass-sand-left' : 'grass-sand-right';
            } else if (Math.abs(dy) === radius && Math.abs(dx) < radius) {
                mapData[y][x] = dy < 0 ? 'grass-sand-up' : 'grass-sand-down';
            } else if (dx === -radius && dy === -radius) {
                mapData[y][x] = 'grass-sand-diagonal1'; // Arriba Izquierda
            } else if (dx === radius && dy === -radius) {
                mapData[y][x] = 'grass-sand-diagonal2'; // Arriba Derecha
            } else if (dx === radius && dy === radius) {
                mapData[y][x] = 'grass-sand-diagonal3'; // Abajo Derecha
            } else if (dx === -radius && dy === radius) {
                // Si falta diagonal4 (Abajo Izquierda), usamos sand o grass-sand-left como parche
                mapData[y][x] = 'sand'; 
            } else {
                mapData[y][x] = 'sand';
            }
        }
    }

    // 1. Iniciamos zoom-in
    setTimeout(() => {
        container.classList.add('zoomed');
        gameState = 'customizing';
        skinMenu.classList.remove('hidden');
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
        'grass-sand-diagonal1', 'grass-sand-diagonal2', 'grass-sand-diagonal3'
    ];
    
    files.forEach(name => {
        tileAssets[name].src = `sprites/tiles/${name}.png`;
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

    // Actualizar Cámara para que el personaje esté centrado
    camera.x = player.x - canvas.width / 2 + player.width / 2;
    camera.y = player.y - canvas.height / 2 + player.height / 2;

    // Animación con DeltaTime
    if (player.isMoving) {
        player.frameTimer += dt;
        if (player.frameTimer > player.frameDuration) {
            player.frame = (player.frame + 1) % totalFrames;
            player.frameTimer = 0;
        }
    } else {
        player.frame = 0; // Primer frame como posición de reposo (Idle en 1)
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
            // Repetir el mapa si se sale de los bordes
            const mx = ((tx % mapSize) + mapSize) % mapSize;
            const my = ((ty % mapSize) + mapSize) % mapSize;
            
            const tileType = mapData[my][mx];
            const drawX = tx * tileSize - camera.x;
            const drawY = ty * tileSize - camera.y;

            if (tileAssets.isLoaded) {
                const img = tileAssets[tileType];
                ctx.drawImage(img, drawX, drawY, tileSize, tileSize);
            } else {
                // Fallback
                ctx.fillStyle = tileType === 'grass' ? '#2d5a27' : '#d2b48c';
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
}

let hudRotation = 0;
let hudRotationTarget = 0;

function drawHUD() {
    if (!hudAssets.isLoaded) return;

    // 1. Icono Corazón (Arriba Izquierda)
    ctx.drawImage(hudAssets.heartDay, 20, 20, 40, 40);

    // 2. Barra de Vida Personalizada
    const barX = 70;
    const barY = 25;
    const barW = 200;
    const barH = 30;
    const borderSize = 4;

    // Borde (5d3350)
    ctx.fillStyle = '#5d3350';
    ctx.fillRect(barX, barY, barW, barH);

    // Fondo (ffb58b)
    ctx.fillStyle = '#ffb58b';
    ctx.fillRect(barX + borderSize, barY + borderSize, barW - (borderSize * 2), barH - (borderSize * 2));

    // Progreso (e240af)
    const progressW = (stats.energy / 100) * (barW - (borderSize * 2));
    if (progressW > 0) {
        ctx.fillStyle = '#e240af';
        ctx.fillRect(barX + borderSize, barY + borderSize, progressW, barH - (borderSize * 2));
    }

    // 3. (El Tablón de Selección ahora se gestiona en CSS como fondo del menú)
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
    drawPlayer();
    drawHUD();

    requestAnimationFrame(gameLoop);
}
