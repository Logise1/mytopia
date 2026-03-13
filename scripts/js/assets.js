async function loadTileAssets() {
    const promises = [];
    const files = [
        'grass', 'sand',
        'grass-sand-up', 'grass-sand-down', 'grass-sand-left', 'grass-sand-right',
        'grass-sand-diagonal',
        'wave1', 'wave2', 'wave3', 'wave4', 'wavebig',
        'brik', 'brikup', 'brikdown', 'brikleft', 'brikrite',
        'brikupdiagonal', 'brikritediagonal', 'brikdowndiagonal', 'brikleftdiagonal'
    ];

    files.forEach(name => {
        let fileName = name;
        if (name === 'grass-sand-diagonal') fileName = 'grass-sand-diagonal1';
        tileAssets[name].src = `sprites/tiles/${fileName}.png`;
        promises.push(new Promise(res => tileAssets[name].onload = res));
    });

    // Cargar nuevas animaciones de agua
    const waterFrames = ['wave2', 'wave5', 'wave6', 'wave7'];
    waterFrames.forEach((frameFile, index) => {
        const id = 'water' + (index + 1);
        tileAssets[id].src = `sprites/tiles/wateranimations/${frameFile}.png`;
        promises.push(new Promise(res => tileAssets[id].onload = res));
    });

    // Cargar árbol, palmera, avión y niebla
    treeAsset.src = 'sprites/textures/tree.png';
    promises.push(new Promise(res => treeAsset.onload = res));

    palmtreeAsset.src = 'sprites/textures/palmtree.png';
    promises.push(new Promise(res => palmtreeAsset.onload = res));

    planeAsset.src = 'sprites/textures/plane.png';
    promises.push(new Promise(res => planeAsset.onload = res));

    insidePlaneAsset.src = 'sprites/textures/insideplane.png';
    promises.push(new Promise(res => insidePlaneAsset.onload = res));

    houseAsset.src = 'sprites/textures/casaplanta.png';
    promises.push(new Promise(res => houseAsset.onload = res));

    dockAsset.src = 'sprites/textures/dock.png';
    promises.push(new Promise(res => dockAsset.onload = res));

    signAsset.src = 'sprites/textures/sign.png';
    promises.push(new Promise(res => signAsset.onload = res));

    floorTileAsset.src = 'sprites/textures/home/suelotile.png';
    promises.push(new Promise(res => floorTileAsset.onload = res));

    const fogFiles = ['fog 1.png', 'fog 2.png', 'fog 3.png'];
    fogFiles.forEach((fileName, i) => {
        fogAssets[i].src = `sprites/textures/${fileName}`;
        promises.push(new Promise(res => fogAssets[i].onload = res));
    });

    await Promise.all(promises);
    tileAssets.isLoaded = true;
}

async function loadFurnitureAssets() {
    const promises = [];

    furnitureAssets.sofa.src = 'sprites/textures/home/sofa.png';
    promises.push(new Promise(res => furnitureAssets.sofa.onload = res));

    await Promise.all(promises);
    furnitureAssets.isLoaded = true;
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
        pupil: 'pupila.svg',
        cuts: 'cuts.svg',
        light: 'light.svg',
        clock1: 'night/clock1.svg',
        clock2: 'night/clock2.svg',
        costume1: 'night/costume1.svg',
        eye1: 'night/eye1.svg',
        eye2: 'night/eye2.svg',
        transition1: 'night/transition.svg',
        transition2: 'night/transition2.svg',
        transition3: 'night/transition3.svg',
        transition4: 'night/transition4.svg',
        transition5: 'night/transition5.svg',
        transition6: 'night/transition6.svg'
    };

    for (const [key, filename] of Object.entries(files)) {
        hudAssets[key].src = `sprites/hud/${filename}`;
        promises.push(new Promise(res => hudAssets[key].onload = res));
    }

    await Promise.all(promises);
    hudAssets.isLoaded = true;
}

async function loadAudioAssets() {
    updateAllVolumes();
    audioAssets.chase.loop = true;
}

async function loadAllAnimations() {
    const loadPromises = [];

    const loadEntityAnim = (entity, basePath) => {
        for (const dir of directions) {
            for (let i = 1; i <= totalFrames; i++) {
                let filename = `walk-${dir}${i}.png`;
                if (dir === 'left' && i === 1) filename = 'walk-left.png';

                const promise = new Promise((resolve) => {
                    const img = new Image();
                    img.src = `${basePath}/${filename}`;
                    img.onload = () => {
                        entity.animations[dir][i - 1] = {
                            original: img,
                            processed: null
                        };
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`No se pudo cargar: ${basePath}/${filename}`);
                        // Create empty to avoid crashes if asset missing
                        entity.animations[dir][i - 1] = { original: null, processed: null };
                        resolve();
                    };
                });
                loadPromises.push(promise);
            }
        }
    };

    loadEntityAnim(player, 'sprites/characters');
    loadEntityAnim(faker, 'sprites/monsters/faker');

    // Cargar 38 frames del emote 1 EN ORDEN SECUENCIAL
    for (let i = 1; i <= 38; i++) {
        await new Promise(resolve => {
            const img = new Image();
            img.src = `sprites/characters/emotes/1/${i}.png`;
            img.onload = () => { 
                emoteFrames[1][i - 1] = img; 
                resolve(); 
            };
            img.onerror = () => { 
                console.warn(`Error cargando emote frame ${i}.png`); 
                resolve(); 
            };
        });
    }

    // Cargar assets de entrada del Faker (Asegurando rutas y nombres claros)
    const loadFakerEnter = (imgObj, primary, fallback) => {
        return new Promise(res => {
            imgObj.src = primary;
            imgObj.onload = res;
            imgObj.onerror = () => {
                imgObj.src = fallback;
                imgObj.onload = res;
                imgObj.onerror = res; // Si falla el fallback también seguimos
            };
        });
    };

    loadPromises.push(loadFakerEnter(faker.enterAssets.enter1, 'sprites/monsters/faker/enter.png', 'sprites/textures/enter.png'));
    loadPromises.push(loadFakerEnter(faker.enterAssets.enter2, 'sprites/monsters/faker/enter2.png', 'sprites/textures/enter2.png'));
    loadPromises.push(loadFakerEnter(faker.enterAssets.enter3, 'sprites/monsters/faker/enter3.png', 'sprites/textures/enter3.png'));

    await Promise.all(loadPromises);
    getSkinAnimations(skinColor);
    getFakerSkinAnimations(skinColor);
}

function getSkinAnimations(color) {
    if (skinCaches[color]) {
        // Si ya está en caché, nos aseguramos de que los frames del emote local se actualicen si es el color activo
        if (color === skinColor) player.emote.frames = skinCaches[color].emotes[1];
        return skinCaches[color].walk;
    }
    
    // Tintar animaciones base
    const newAnimSet = tintAnimations(player.animations, color);

    // Tintar emotes
    const tannedEmotes = [];
    const targetColor = hexToRgb(color);
    if (targetColor && emoteFrames[1].length > 0) {
        emoteFrames[1].forEach((img, idx) => {
            if (!img) return;
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
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
            tannedEmotes[idx] = tempCanvas;
        });
    }

    skinCaches[color] = { walk: newAnimSet, emotes: { 1: tannedEmotes } };
    
    if (color === skinColor) {
        player.emote.frames = tannedEmotes;
    }

    return newAnimSet;
}

const fakerSkinCaches = {};

function getFakerSkinAnimations(color) {
    if (fakerSkinCaches[color]) return fakerSkinCaches[color];

    // Tintar animaciones de caminata
    const newAnimSet = tintAnimations(faker.animations, color);

    // Tintar también los assets de entrada para que coincidan con la piel
    const tintSingle = (img) => {
        if (!img || !img.complete || img.naturalWidth === 0) return img;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        tempCtx.drawImage(img, 0, 0);
        const target = hexToRgb(color);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a > 0 && g > r && g > b) {
                const factor = g / 255;
                data[i] = Math.floor(target.r * factor);
                data[i + 1] = Math.floor(target.g * factor);
                data[i + 2] = Math.floor(target.b * factor);
            }
        }
        tempCtx.putImageData(imageData, 0, 0);
        return tempCanvas;
    };

    faker.enterAssets.enter1Processed = tintSingle(faker.enterAssets.enter1);
    faker.enterAssets.enter2Processed = tintSingle(faker.enterAssets.enter2);
    faker.enterAssets.enter3Processed = tintSingle(faker.enterAssets.enter3);

    fakerSkinCaches[color] = newAnimSet;
    return newAnimSet;
}

function tintAnimations(sourceAnimations, color) {
    const targetColor = hexToRgb(color);
    if (!targetColor) return sourceAnimations;

    const newAnimSet = { up: [], down: [], left: [], right: [], forward: [] };

    for (const dir in sourceAnimations) {
        if (!sourceAnimations[dir] || sourceAnimations[dir].length === 0) continue;
        sourceAnimations[dir].forEach((frameData, idx) => {
            if (!frameData || !frameData.original) {
                newAnimSet[dir][idx] = { original: null, processed: null };
                return;
            }

            const img = frameData.original;
            if (!img.complete || img.naturalWidth === 0) {
                newAnimSet[dir][idx] = { original: img, processed: null };
                return;
            }

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;

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

            newAnimSet[dir][idx] = {
                original: img,
                processed: tempCanvas
            };
        });
    }

    // Asegurar que si falta una dirección, al menos tenga el primer frame de 'forward'
    const validDirs = ['up', 'down', 'left', 'right', 'forward'];
    const fallbackDir = sourceAnimations['forward'] ? 'forward' : (sourceAnimations['up'] ? 'up' : null);
    if (fallbackDir) {
        validDirs.forEach(d => {
            if (newAnimSet[d].length === 0) {
                newAnimSet[d] = newAnimSet[fallbackDir];
            }
        });
    }

    return newAnimSet;
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
        getSkinAnimations(skinColor);
        getFakerSkinAnimations(skinColor);
    });
});

startBtn.addEventListener('click', () => {
    gameState = 'playing';
    skinMenu.classList.add('hidden');
});

// Selección de color de CASA
document.querySelectorAll('.house-color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelector('.house-color-btn.selected')?.classList.remove('selected');
        e.target.classList.add('selected');
        houseColor = e.target.dataset.color;
    });
});

document.getElementById('close-house-menu').addEventListener('click', () => {
    gameState = 'playing';
    document.getElementById('house-menu').classList.add('hidden');
});

