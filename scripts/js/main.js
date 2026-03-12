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

    // --- MODO VIAJE ESPECIAL ---
    if (gameState === 'traveling') {
        // Cielo de viaje
        ctx.fillStyle = worldTime >= 20 || worldTime <= 6 ? '#050528' : '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Nubes o fondo
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        const cloudX = (performance.now() * 0.05) % (canvas.width + 400) - 200;
        ctx.arc(cloudX, 150, 60, 0, Math.PI * 2);
        ctx.arc(cloudX + 80, 150, 80, 0, Math.PI * 2);
        ctx.fill();

        // Calcular posición del avión / transición
        // Animado rápido cada 0.1s
        const frameIndex = Math.floor(travelTimer * 10) % 6 + 1;
        const flightImg = hudAssets['transition' + frameIndex];

        if (flightImg && flightImg.complete) {
            // El avión se mueve de izquierda a derecha durante los 30s
            const flightX = (travelTimer / TRAVEL_TIME) * (canvas.width + 300) - 150;
            const flightY = canvas.height / 2 - 100 + Math.sin(travelTimer * 2) * 20; // Movimiento ondulado
            
            // Dibujar grande!
            ctx.drawImage(flightImg, flightX, flightY, 200, 200);
        }

        if (debug.active) updateDebugPanel();
        requestAnimationFrame(gameLoop);
        return;
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
        renderList.push({ y: hy + 160, draw: () => drawHouse(hx - camera.x, hy - camera.y, hx, hy) });
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
});
