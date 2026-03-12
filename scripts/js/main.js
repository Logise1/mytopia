// Inicialización
window.onload = async () => {
    // 1. Firebase primero
    await initFirebase();

    // 2. Generar isla básica inicial
    generateIsland('home');

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
    player.x = (mapSize / 2) * 64;
    player.y = (mapSize / 2) * 64;

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


function gameLoop(currentTime) {
    deltaTime = (currentTime - lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1;
    lastTime = currentTime;

    update(deltaTime);

    // Actualizar otros jugadores (LERP y Anim)
    for (let uid in multiplayer.players) {
        const p = multiplayer.players[uid];
        p.x += (p.targetX - p.x) * 10 * deltaTime;
        p.y += (p.targetY - p.y) * 10 * deltaTime;
        if (p.isMoving) p.frame = (p.frame + 10 * deltaTime) % totalFrames;
        else p.frame = 0;
    }

    if (gameState === 'playing') {
        if (player.isMoving) stats.energy -= 5 * deltaTime;
        else stats.energy += 2 * deltaTime;
        stats.energy = Math.max(0, Math.min(100, stats.energy));
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- MODO VIAJE ESPECIAL (Fase Central) ---
    const isPhase2 = gameState === 'traveling' && travelTimer > 3 && travelTimer < 27;
    
    if (isPhase2) {
        if (insidePlaneAsset && insidePlaneAsset.complete && insidePlaneAsset.naturalWidth > 0) {
            // Dibujar el interior del avion ocupando toda la pantalla sin preservar aspect ratio para que cubra la UI
            ctx.drawImage(insidePlaneAsset, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = worldTime >= 20 || worldTime <= 6 ? '#050528' : '#87CEEB';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (debug.active) updateDebugPanel();
        requestAnimationFrame(gameLoop);
        return; // Terminamos aqui, no saltamos el renderizado del mapa
    }

    drawTiles();

    // Dibujar el sistema de Sombras Raytracing primero para que se proyecten en el suelo
    drawTreeShadows();
    drawPlayerShadows();

    // --- SISTEMA DE ORDENACIÓN (Y-SORTING) ---
    const renderList = [];

    // 1. Jugador Local
    renderList.push({ y: player.y + player.height, draw: () => drawPlayer() });

    // 2. Otros Jugadores
    for (let uid in multiplayer.players) {
        renderList.push({ y: multiplayer.players[uid].y + player.height, draw: () => drawSingleOtherPlayer(uid) });
    }

    // 3. Árboles (Ordenamos por la base inferior de su hitbox para que sea perfecto)
    treeData.forEach(tree => {
        const sortingY = tree.y * 64 + treeHitbox.yRel + (treeHitbox.h / 2);
        renderList.push({ y: sortingY, draw: () => drawSingleTree(tree, 64) });
    });

    // 3.2 Palmeras
    palmtreeData.forEach(tree => {
        const sortingY = tree.y * 64 + treeHitbox.yRel + (treeHitbox.h / 2);
        renderList.push({ y: sortingY, draw: () => drawSinglePalmtree(tree, 64) });
    });

    // 3.5. Faker
    if (faker && faker.active) {
        renderList.push({ y: faker.y + faker.height, draw: () => drawFaker() });
    }

    if (islandFeatures.house) {
        const hx = islandFeatures.house.x * 64;
        const hy = islandFeatures.house.y * 64;
        renderList.push({ y: hy + 160, draw: () => drawHouse(hx - camera.x, hy - camera.y) });
    }

    if (islandFeatures.dock) {
        const dx = islandFeatures.dock.x * 64;
        const dy = islandFeatures.dock.y * 64;
        // El muelle suele estar al nivel del suelo/agua, lo ponemos con un sorting Y bajo
        renderList.push({ y: dy + 32, draw: () => drawDock(dx - camera.x, dy - camera.y) });
    }

    // 4. Avión / Puerta
    const isInside = currentIsland.endsWith('_inside');
    if (!isInside) {
        const airplaneY = planeY * 64 + 64;
        renderList.push({ y: airplaneY, draw: () => drawAirplane(planeX * 64 - camera.x, planeY * 64 - camera.y) });
    } else {
        const doorY = (mapSize/2 + 5)*64;
        const doorX = (mapSize/2)*64;
        renderList.push({ y: doorY + 64, draw: () => drawInsideDoor(doorX - camera.x, doorY - camera.y, doorX, doorY) });
    }

    // Ordenar y dibujar (Capa de profundidad)

    renderList.sort((a, b) => a.y - b.y);
    renderList.forEach(item => item.draw());

    // Luces y Efectos
    applyDayNightEffect();
    drawHUD();
    drawInteractionPrompt();

    // Sincronización
    sendMovement();

    if (debug.active) updateDebugPanel();
    requestAnimationFrame(gameLoop);
}


window.addEventListener('keydown', e => {
    if (e.code === 'KeyP') {
        e.preventDefault();
        toggleDebug();
    }
    if (e.code === 'KeyQ') {
        const socialMenu = document.getElementById('social-menu');
        if (socialMenu) {
            socialMenu.classList.toggle('hidden');
        }
    }
});
