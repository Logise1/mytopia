// --- GENERADOR DE ISLAS ---
function generateIsland(islandId) {
    mapData.length = 0;
    treeData.length = 0;
    palmtreeData.length = 0;
    islandFeatures.house = null;
    islandFeatures.dock = null;

    const isInside = islandId.endsWith('_inside');
    mapSize = islandId === 'central' ? 140 : (isInside ? 30 : 100);
    
    seed = [...islandId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    if (islandId === 'home' && multiplayer.userId) {
        seed = [...multiplayer.userId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }
    
    const centerX = mapSize / 2;
    const centerY = mapSize / 2;
    // Central island is 2.5x bigger in radius
    const grassRadius = islandId === 'central' ? 35 : 14;
    const sandRadius = islandId === 'central' ? 42 : 20;

    if (isInside) {
        for (let y = 0; y < mapSize; y++) {
            mapData[y] = [];
            for (let x = 0; x < mapSize; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                // Generar un 10x10 de madera y el resto background
                if (dx >= -5 && dx <= 5 && dy >= -5 && dy <= 5) {
                    mapData[y][x] = 'woodFloor';
                } else {
                    mapData[y][x] = 'black';
                }
            }
        }
        planeX = centerX;
        planeY = centerY + 4; // Puerta logica
        return;
    }

    for (let y = 0; y < mapSize; y++) {
        mapData[y] = [];
        for (let x = 0; x < mapSize; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (absDx < grassRadius && absDy < grassRadius) {
                mapData[y][x] = 'grass';
                // La zona de la casa está entre dx: -7 y -1, dy: -5 y +1
                const isHouseArea = islandId !== 'central' && dx >= -7 && dx <= -1 && dy >= -5 && dy <= 1;
                if (seededRandom() < 0.05 && absDx > 1 && absDy > 1 && !(dx === 2 && dy === grassRadius - 1) && !isHouseArea) {
                    treeData.push({ x, y });
                }
            } else if (absDx === grassRadius && absDy < grassRadius) {
                mapData[y][x] = dx < 0 ? 'grass-sand-left' : 'grass-sand-right';
            } else if (absDy === grassRadius && absDx < grassRadius) {
                mapData[y][x] = dy < 0 ? 'grass-sand-up' : 'grass-sand-down';
            } else if (dx === -grassRadius && dy === -grassRadius) {
                mapData[y][x] = 'grass-sand-diagonal';
            } else if (dx === grassRadius && dy === -grassRadius) {
                mapData[y][x] = 'grass-sand-diagonal_TR';
            } else if (dx === grassRadius && dy === grassRadius) {
                mapData[y][x] = 'grass-sand-diagonal_BR';
            } else if (dx === -grassRadius && dy === grassRadius) {
                mapData[y][x] = 'grass-sand-diagonal_BL';
            } else if (absDx < sandRadius && absDy < sandRadius) {
                mapData[y][x] = 'sand';
                // Generar palmera ocasionalmente
                if (seededRandom() < 0.02 && (absDx > grassRadius + 1 || absDy > grassRadius + 1)) {
                    palmtreeData.push({ x, y });
                }
            } else if (absDx === sandRadius && absDy < sandRadius) {
                mapData[y][x] = dx < 0 ? 'wave_W' : 'wave_E';
            } else if (absDy === sandRadius && absDx < sandRadius) {
                mapData[y][x] = dy < 0 ? 'wave_N' : 'wave_S';
            } else if (dx === -sandRadius && dy === -sandRadius) {
                mapData[y][x] = 'wave4_TL';
            } else if (dx === sandRadius && dy === -sandRadius) {
                mapData[y][x] = 'wave4_TR';
            } else if (dx === sandRadius && dy === sandRadius) {
                mapData[y][x] = 'wave4_BR';
            } else if (dx === -sandRadius && dy === sandRadius) {
                mapData[y][x] = 'wave4_BL';
            } else {
                mapData[y][x] = 'water'; // Océano infinito sin olas grandes
            }
        }
    }

    if (islandId !== 'central' && !isInside) {
        islandFeatures.house = { x: centerX - 5, y: centerY - 2 };
        islandFeatures.dock = { x: centerX, y: centerY + sandRadius };
    }

    // Poner avión a la derecha del muelle
    planeX = centerX + 2;
    planeY = centerY + sandRadius;
}

function enterHouse(baseIslandId) {
    currentIsland = baseIslandId + '_inside';
    generateIsland(currentIsland);
    player.x = (mapSize / 2) * 64;
    player.y = (mapSize / 2 + 4) * 64;
    multiplayer.players = {};
    multiplayer.lastSend = 0;
    sendMovement();
}

function exitHouse() {
    currentIsland = currentIsland.replace('_inside', '');
    generateIsland(currentIsland);
    if (islandFeatures.house) {
        player.x = islandFeatures.house.x * 64 + 64;
        player.y = islandFeatures.house.y * 64 + 180; // Aparezco en el portal
    }
    multiplayer.players = {};
    multiplayer.lastSend = 0;
    sendMovement();
}

