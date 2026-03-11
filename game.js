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

// Delta Time
let lastTime = performance.now();
let deltaTime = 0;

// Personaje y Animaciones
const player = {
    x: 0, // Posición en el mundo
    y: 0,
    vx: 0, // Velocidad actual en X
    vy: 0, // Velocidad actual en Y
    speed: 1500, // Aceleración (pixeles por segundo²)
    maxSpeed: 400, // Velocidad máxima
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

    // 2. Cargar y procesar todos los sprites
    await loadAllAnimations();

    // 3. Listeners teclado
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);

    // 4. Game loop
    requestAnimationFrame(gameLoop);
};

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

    // Posición del personaje en pantalla (siempre centrado por la cámara)
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    // Saltitos al caminar (solo si se mueve)
    let jumpOffset = 0;
    if (player.isMoving) {
        // Usamos el tiempo para un rebote fluido
        jumpOffset = -Math.abs(Math.sin(performance.now() * 0.015)) * 8;
    }

    if (!frameData || !frameData.processed) {
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(screenX + player.width / 2, screenY + player.height / 2 + jumpOffset, 20, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frameData.processed, screenX, screenY + jumpOffset, player.width, player.height);
}

function gameLoop(currentTime) {
    // Calcular deltaTime en segundos
    deltaTime = (currentTime - lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1; // Cap para evitar saltos bruscos
    lastTime = currentTime;

    update(deltaTime);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTiles();
    drawPlayer();

    requestAnimationFrame(gameLoop);
}
