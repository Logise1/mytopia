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
                
                // Mytopia Plaza: Cuadrado 10x10 de ladrillos en el centro REAL de la isla central
                if (islandId === 'central' && dx >= -5 && dx <= 4 && dy >= -5 && dy <= 4) {
                    const bx = dx + 5; // 0 a 9
                    const by = dy + 5; // 0 a 9
                    
                    if (bx === 0 && by === 0) mapData[y][x] = 'brikleftdiagonal';      // Top-Left (Left to Up)
                    else if (bx === 9 && by === 0) mapData[y][x] = 'brikupdiagonal';   // Top-Right (Up to Rite)
                    else if (bx === 9 && by === 9) mapData[y][x] = 'brikritediagonal'; // Bottom-Right (Rite to Down)
                    else if (bx === 0 && by === 9) mapData[y][x] = 'brikdowndiagonal'; // Bottom-Left (Down to Left)
                    else if (by === 0) mapData[y][x] = 'brikup';
                    else if (by === 9) mapData[y][x] = 'brikdown';
                    else if (bx === 0) mapData[y][x] = 'brikleft';
                    else if (bx === 9) mapData[y][x] = 'brikrite';
                    else mapData[y][x] = 'brik';
                }

                // La zona de la casa está entre dx: -7 y -1, dy: -5 y +1
                const isPlazaArea = islandId === 'central' && dx >= -5 && dx <= 5 && dy >= -5 && dy <= 5;
                const isHouseArea = islandId !== 'central' && dx >= -7 && dx <= -1 && dy >= -5 && dy <= 1;
                if (seededRandom() < 0.05 && absDx > 1 && absDy > 1 && !(dx === 2 && dy === grassRadius - 1) && !isHouseArea && !isPlazaArea) {
                    const tooClose = treeData.some(t => Math.hypot(t.x - x, t.y - y) < 4);
                    if (!tooClose) treeData.push({ x, y });
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
                    const tooClose = palmtreeData.some(p => Math.hypot(p.x - x, p.y - y) < 6);
                    if (!tooClose) palmtreeData.push({ x, y });
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

    if (!isInside) {
        if (islandId !== 'central') {
            islandFeatures.house = { x: centerX - 5, y: centerY - 2 };
        }
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

