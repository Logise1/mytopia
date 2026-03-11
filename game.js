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
    states: [],
    pupil: new Image()
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

// Inicialización
window.onload = async () => {
    // 1. Iniciamos zoom-in
    setTimeout(() => {
        container.classList.add('zoomed');
        gameState = 'customizing';
        skinMenu.classList.remove('hidden');
    }, 500);

    // 2. Cargar Assets
    await Promise.all([
        loadAllAnimations(),
        loadHUDAssets()
    ]);

    // 3. Listeners
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    
    // Seguimiento de mouse para el HUD
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // 4. Game loop
    requestAnimationFrame(gameLoop);
};

async function loadHUDAssets() {
    hudAssets.pupil.src = 'sprites/hud/pupila.svg';
    const promises = [];
    
    for (let i = 1; i <= 8; i++) {
        const img = new Image();
        const suffix = i === 1 ? '' : i;
        img.src = `sprites/hud/hud${suffix}.svg`;
        promises.push(new Promise(res => img.onload = res));
        hudAssets.states[i-1] = img;
    }
    
    return Promise.all(promises);
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
        player.frame = 1; // Idle frame
    }
}

function drawTiles() {
    const tileSize = 64;

    // Calcular el rango de tiles visibles según la cámara
    const startX = Math.floor(camera.x / tileSize) * tileSize;
    const startY = Math.floor(camera.y / tileSize) * tileSize;
    const endX = startX + canvas.width + tileSize;
    const endY = startY + canvas.height + tileSize;

    for (let x = startX; x < endX; x += tileSize) {
        for (let y = startY; y < endY; y += tileSize) {
            const drawX = x - camera.x;
            const drawY = y - camera.y;

            if (!tileSpriteImg || !tileSpriteImg.complete || tileSpriteImg.naturalWidth === 0) {
                // Fallback de tiles con offset de cámara
                ctx.fillStyle = (Math.abs(x + y) / tileSize) % 2 === 0 ? '#2d5a27' : '#32622c';
                ctx.fillRect(drawX, drawY, tileSize, tileSize);
            } else {
                ctx.drawImage(tileSpriteImg, drawX, drawY, tileSize, tileSize);
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

    if (player.isMoving) {
        // Sincronizamos el rebote con el ciclo de 6 frames (2 botes por ciclo completo)
        const cycleProgress = (player.frame + (player.frameTimer / player.frameDuration)) / 6;
        const bounce = Math.abs(Math.sin(cycleProgress * Math.PI * 2)); // Dos rebotes rítmicos
        
        jumpOffset = -bounce * 12;
        
        // Squash and Stretch: Se estira en el aire y se aplasta al caer
        const s = (bounce - 0.5) * 0.15; // Factor de deformación
        scaleY = 1 + s;
        scaleX = 1 - s;
    }

    const drawW = player.width * scaleX;
    const drawH = player.height * scaleY;
    // Ajustar posición para que la base del personaje esté en el suelo
    const drawX = screenX + (player.width - drawW) / 2;
    const drawY = screenY + (player.height - drawH) + jumpOffset;

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

function drawHUD() {
    if (hudAssets.states.length < 8) return;

    // 1. Elegir estado basado en energía
    const stateIndex = Math.floor((stats.energy / 100.1) * 8);
    const mainHUD = hudAssets.states[stateIndex] || hudAssets.states[0];

    // 2. HUD Gigante (Ocupa casi toda la pantalla como un marco)
    const hudW = canvas.width;
    const hudH = canvas.height;
    const posX = 0;
    const posY = 0;

    // Dibujamos el HUD con algo de transparencia para que no tape todo el juego
    ctx.globalAlpha = 0.8;
    ctx.drawImage(mainHUD, posX, posY, hudW, hudH);
    ctx.globalAlpha = 1.0;

    // 3. Pupilas Gigantes
    // Escalamos las coordenadas originales (44/150 y 106/150 para X, 38/75 para Y)
    // al tamaño del canvas (800x600)
    const eyeLX = hudW * (43 / 150); // Ajuste fino para los SVGs
    const eyeLY = hudH * (38 / 75);
    const eyeRX = hudW * (107 / 150);
    const eyeRY = hudH * (38 / 75);

    drawPupils(eyeLX, eyeLY, eyeRX, eyeRY, 30); // PupilSize 30 para que sean grandes
}

function drawPupils(lx, ly, rx, ry, pupilSize = 12) {
    if (!hudAssets.pupil.complete) return;

    const followMouse = (ex, ey) => {
        const dx = mouseX - ex;
        const dy = mouseY - ey;
        const angle = Math.atan2(dy, dx);
        // Distancia de movimiento de la pupila más grande para el HUD grande
        const maxMove = pupilSize * 1.5; 
        const dist = Math.min(maxMove, Math.hypot(dx, dy) / 15);
        
        return {
            x: ex + Math.cos(angle) * dist,
            y: ey + Math.sin(angle) * dist
        };
    };

    const eyeL = followMouse(lx, ly);
    const eyeR = followMouse(rx, ry);

    ctx.drawImage(hudAssets.pupil, eyeL.x - pupilSize/2, eyeL.y - pupilSize/2, pupilSize, pupilSize);
    ctx.drawImage(hudAssets.pupil, eyeR.x - pupilSize/2, eyeR.y - pupilSize/2, pupilSize, pupilSize);
}

function gameLoop(currentTime) {
    deltaTime = (currentTime - lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1;
    lastTime = currentTime;

    update(deltaTime);
    
    if (gameState === 'playing') {
        if (player.isMoving) {
            stats.energy -= 5 * deltaTime; // Gastar más energía al movernos
        } else {
            stats.energy += 2 * deltaTime; // Recuperar si estamos quietos
        }
        stats.energy = Math.max(0, Math.min(100, stats.energy));
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTiles();
    drawPlayer();
    drawHUD();

    requestAnimationFrame(gameLoop);
}
