const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
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
let worldTime = 12; // De 0 a 24 adaptativo
let debugTimeOffsetMinutes = 0;
let uiCyclePhase = 'day'; 
let uiTransitionAnimTime = -1;

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
    cuts: new Image(),
    light: new Image(),
    clock1: new Image(),
    clock2: new Image(),
    costume1: new Image(),
    eye1: new Image(),
    eye2: new Image(),
    transition1: new Image(),
    transition2: new Image(),
    transition3: new Image(),
    transition4: new Image(),
    transition5: new Image(),
    transition6: new Image(),
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

// Monstruo Faker
const faker = {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 1200,
    maxSpeed: 300,
    width: 64,
    height: 64,
    direction: 'forward',
    isMoving: false,
    frame: 0,
    frameTimer: 0,
    frameDuration: 0.1,
    animations: {
        forward: [],
        up: [],
        left: [],
        right: []
    },
    spawnState: 'hidden', // hidden, enter1, enter2, enter3, chasing
    spawnTimer: 0,
    enterAssets: {
        enter1: new Image(),
        enter2: new Image(),
        enter3: new Image(),
        enter1Processed: null,
        enter2Processed: null,
        enter3Processed: null
    },
    spawnWait: 0, // Timer para esperar antes de aparecer
    visionRange: 350,
    strength: 0
};

const PIXEL_SCALE = 2; // Factor global para que todos los pixeles tengan el mismo tamaño real en pantalla

// Cámara (seguirá al personaje)
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
};

const directions = ['forward', 'up', 'left', 'right'];
const totalFrames = 6;
const keys = {};

// Assets Suelo
const tileAssets = {
    grass: new Image(),
    sand: new Image(),
    water1: new Image(),
    water2: new Image(),
    water3: new Image(),
    water4: new Image(),
    'grass-sand-up': new Image(),
    'grass-sand-down': new Image(),
    'grass-sand-left': new Image(),
    'grass-sand-right': new Image(),
    'grass-sand-diagonal': new Image(),
    'wave1': new Image(),
    'wave2': new Image(),
    'wave3': new Image(),
    'wave4': new Image(),
    'wavebig': new Image(),
    'brik': new Image(),
    'brikup': new Image(),
    'brikdown': new Image(),
    'brikleft': new Image(),
    'brikrite': new Image(),
    'brikupdiagonal': new Image(),
    'brikritediagonal': new Image(),
    'brikdowndiagonal': new Image(),
    'brikleftdiagonal': new Image(),
    isLoaded: false
};

let mapSize = 100;
const mapData = [];
const treeData = []; // Guardar posiciones de árboles
const palmtreeData = []; // Guardar posiciones de palmeras
const treeAsset = new Image();
const palmtreeAsset = new Image();
const planeAsset = new Image();
const insidePlaneAsset = new Image();
const houseAsset = new Image();
const dockAsset = new Image();
const signAsset = new Image();
const floorTileAsset = new Image();
const furnitureAssets = {
    sofa: new Image(),
    isLoaded: false
};
const fogAssets = [new Image(), new Image(), new Image()];
const audioAssets = {
    ambience: new Audio('sfx/music/ambiencemonsters.mp3'),
    chase: new Audio('sfx/music/persecucion.mp3'),
    chaseTimer: 0,
    chaseDelay: 10 + Math.random() * 5, // 10-15s
    ambienceTimer: 0,
    isDead: false
};
let treeShadowCanvas = null;
let mytopianFriends = []; // Array of saved friend names
let hasSetFriends = false;

let currentIsland = 'home'; 
let isTraveling = false;
let currentActionPrompt = null;
let travelTimer = 0;
const TRAVEL_TIME = 45; // Real life 45s (slower animation)
let houseColor = 'none'; // Color tint for the house
let planeX = 0, planeY = 0;

const islandFeatures = { house: null, dock: null };
let currentZone = '';
let zoneMessageTimer = 0;

// Configuración de Hitbox de Árbol (para ajustes fáciles)
const treeHitbox = {
    xRel: 32,
    yRel: 45,
    w: 110,
    h: 30
};

const houseHitbox = {
    xRel: 64, // Centrado relativo al anchor
    yRel: 65, // Alineado con la base visual (hy + 80)
    w: 120,
    h: 40
};

const palmtreeHitbox = {
    xRel: 32,
    yRel: 45,
    w: 60,
    h: 25
};

const planeHitbox = {
    xRel: 60,
    yRel: 50,
    w: 120,
    h: 80
};

// Semilla para aleatoriedad consistente
let seed = 42;
function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
}

// Multiplayer
const multiplayer = {
    players: {}, // Otros jugadores
    userId: null,
    username: "",
    lastSend: 0,
    status: "Explorando",
    friends: [], // Lista de UIDs de amigos
    allUsers: {}, // Cache de todos los usuarios para añadir amigos
    currentIslandOwnerUid: null
};

const skinCaches = {}; // Almacenar el spritesheet procesado para cada color de piel visto

// --- ECONOMÍA Y DECORACIÓN ---
let coinCount = 500;
let homeFurniture = []; // [{type: 'sofa', x: 100, y: 100}]
let houseWallPhotoId = null; 
let houseWallPhotoImage = new Image();
let selectedFurniture = null; // Mueble que estamos arrastrando
let editingFurniture = null;  // Mueble seleccionado para cambiar propiedades (color/borrar)

