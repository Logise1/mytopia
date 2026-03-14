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
        loadTileAssets(),
        loadFurnitureAssets(),
        loadAudioAssets()
    ]);

    // Posicionar jugador en el centro de la isla
    player.x = (mapSize / 2) * 64;
    player.y = (mapSize / 2) * 64;

    document.getElementById('coin-count').innerText = coinCount;

    // 3. Listeners
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // 4. Game loop
    if (minimapCanvas) {
        minimapCanvas.width = 160;
        minimapCanvas.height = 160;
    }
    requestAnimationFrame(gameLoop);

    // 5. Configuración de Sliders de Volumen
    const musicSlider = document.getElementById('music-volume-slider');
    const sfxSlider = document.getElementById('sfx-volume-slider');

    if (musicSlider) {
        musicSlider.value = musicVolume; // Sincronizar con valor cargado
        musicSlider.addEventListener('input', (e) => {
            musicVolume = parseFloat(e.target.value);
            localStorage.setItem('musicVolume', musicVolume); // Guardar
            updateAllVolumes();
        });
    }

    if (sfxSlider) {
        sfxSlider.value = sfxVolume; // Sincronizar con valor cargado
        sfxSlider.addEventListener('input', (e) => {
            sfxVolume = parseFloat(e.target.value);
            localStorage.setItem('sfxVolume', sfxVolume); // Guardar
            updateAllVolumes();
        });
    }
};


function gameLoop(currentTime) {
    deltaTime = (currentTime - lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1;
    lastTime = currentTime;

    update(deltaTime);

    // Actualizar otros jugadores (LERP y Anim) con mayor factor para suavidad
    for (let uid in multiplayer.players) {
        const p = multiplayer.players[uid];
        // Factor de 12 para seguir el ritmo de 150ms
        p.x += (p.targetX - p.x) * 12 * deltaTime;
        p.y += (p.targetY - p.y) * 12 * deltaTime;
        if (p.isMoving) p.frame = (p.frame + 12 * deltaTime) % totalFrames;
        else p.frame = 0;
    }

    if (gameState === 'playing') {
        if (player.isMoving) stats.energy -= 5 * deltaTime;
        else stats.energy += 2 * deltaTime;
        stats.energy = Math.max(0, Math.min(100, stats.energy));
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- MODO VIAJE ESPECIAL (Fase Central: del despegue al inicio del aterrizaje) ---
    const isPhase2 = gameState === 'traveling' && travelTimer > 8 && travelTimer < (TRAVEL_TIME - 8);
    
    if (isPhase2) {
        if (insidePlaneAsset && insidePlaneAsset.complete && insidePlaneAsset.naturalWidth > 0) {
            // Dibujar el interior del avion ocupando la mitad izquierda de la pantalla
            ctx.drawImage(insidePlaneAsset, 0, 0, canvas.width / 2, canvas.height);
        } else {
            ctx.fillStyle = worldTime >= 20 || worldTime <= 6 ? '#050528' : '#87CEEB';
            ctx.fillRect(0, 0, canvas.width / 2, canvas.height);
        }

        if (debug.active) updateDebugPanel();
        requestAnimationFrame(gameLoop);
        return; // Terminamos aqui, no saltamos el renderizado del mapa
    }

    // --- RENDERIZADO DEL MUNDO CON ZOOM ---
    ctx.save();
    // Centrar el zoom en el medio de la pantalla
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    drawTiles();

    // Dibujar el sistema de Sombras Raytracing primero para que se proyecten en el suelo
    drawTreeShadows();
    drawPalmtreeShadows();
    drawHouseShadow();
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
        renderList.push({ y: hy + 80, draw: () => drawHouse(hx - camera.x, hy - camera.y) });
    }

    if (islandFeatures.dock) {
        const dx = islandFeatures.dock.x * 64;
        const dy = islandFeatures.dock.y * 64;
        // El muelle suele estar al nivel del suelo/agua, lo ponemos con un sorting Y bajo
        renderList.push({ y: dy + 32, draw: () => drawDock(dx - camera.x, dy - camera.y) });
    }

    // 4. Avión / Puerta
    const isInside = currentIsland.includes('_inside');
    if (!isInside) {
        const airplaneY = planeY * 64 + 64;
        renderList.push({ y: airplaneY, draw: () => drawAirplane(planeX * 64 - camera.x, planeY * 64 - camera.y) });
        
        // Cartel al lado del avión/muelle - SUBIDO MÁS A LA ARENA
        const signX = (planeX - 1) * 64;
        const signY = (planeY - 5) * 64; // Subido 5 tiles
        renderList.push({ y: signY + 64, draw: () => drawSign(signX - camera.x, signY - camera.y) });

        // Lógica de proximidad para el cartel
        const distSign = Math.hypot(player.x - (signX + 32), player.y - (signY + 32));
        if (distSign < 100) {
            let islandName = "Mytopia Main Island";
            if (currentIsland === 'home') islandName = (multiplayer.username || "Tu") + "'s Island";
            else if (!currentIsland.includes('_inside')) {
                islandName = currentIsland.charAt(0).toUpperCase() + currentIsland.slice(1) + "'s Island";
            }
            currentActionPrompt = islandName;
        }
    } else {
        const doorY = (mapSize/2 + 5)*64;
        const doorX = (mapSize/2)*64;
        renderList.push({ y: doorY + 64, draw: () => drawInsideDoor(doorX - camera.x, doorY - camera.y, doorX, doorY) });
    }

    // Dibujar muebles si estamos dentro
    if (isInside) {
        const photoWallY = (mapSize/2 - 5) * 64;
        renderList.push({ y: photoWallY - 200, draw: () => drawHouseWallPhoto() });

        homeFurniture.forEach(f => {
            renderList.push({ y: f.y, draw: () => drawFurnitureSingle(f) }); 
        });
    }

    // Ordenar y dibujar (Capa de profundidad)
    renderList.sort((a, b) => a.y - b.y);
    renderList.forEach(item => item.draw());

    ctx.restore(); // Fin del zoom

    // Luces y Efectos
    applyDayNightEffect();
    applyChromaticAberration();
    drawHUD();
    drawStaminaBar();
    drawInteractionPrompt();
    drawMinimap();
    if (window.updateCharacterPreview) window.updateCharacterPreview();

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

    // --- Soporte global para ENTER / X en botones ---
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyX') {
        // 1. Iniciar juego si el menú de skin está abierto
        const skinMenu = document.getElementById('skin-menu');
        if (skinMenu && !skinMenu.classList.contains('hidden')) {
            document.getElementById('start-game').click();
        }

        // 2. Cerrar menú de casa
        const houseMenu = document.getElementById('house-menu');
        if (houseMenu && !houseMenu.classList.contains('hidden')) {
            document.getElementById('close-house-menu').click();
        }

        // 3. Añadir amigo si el input está enfocado
        const friendInput = document.getElementById('friend-search-input');
        if (friendInput === document.activeElement) {
            document.getElementById('add-friend-btn').click();
        }
        
        // 4. Auth (Login/Register)
        const authMenu = document.getElementById('auth-menu');
        if (authMenu && !authMenu.classList.contains('hidden')) {
            document.getElementById('auth-action-btn').click();
        }
    }
});

// --- LÓGICA DE EDITOR DE MUEBLES ---
window.addEventListener('keydown', e => {
    if (e.code === 'KeyE' && currentIsland.includes('_inside')) {
        const editor = document.getElementById('furniture-editor');
        editor.classList.toggle('hidden');
    }
});

const furniturePrices = { sofa: 100, table: 50, bed: 150, rug: 30 };

document.querySelectorAll('.furniture-item').forEach(item => {
    item.onclick = (e) => {
        e.stopPropagation();
        const type = item.dataset.type;
        const price = furniturePrices[type];

        if (coinCount >= price) {
            coinCount -= price;
            document.getElementById('coin-count').innerText = coinCount;
            
            const newF = {
                type: type,
                x: Math.floor(player.x / 64) * 64 + 32, // Centrado en la tile
                y: Math.floor(player.y / 64) * 64 + 32,
                color: '#ffffff' // Default white tint
            };
            homeFurniture.push(newF);
            selectedFurniture = newF;
            // No ponemos editingFurniture aquí para que no salga el borde amarillo nada más comprar
            saveFurniture(); // Guardar al comprar
        } else {
            alert("¡No tienes suficientes MyMonedas! 🪙");
        }
    };
});

document.getElementById('close-furniture-btn').onclick = () => {
    document.getElementById('furniture-editor').classList.add('hidden');
    selectedFurniture = null;
};

// Selección de color de MUEBLES
document.querySelectorAll('.f-color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (editingFurniture) {
            document.querySelector('.f-color-btn.selected')?.classList.remove('selected');
            e.target.classList.add('selected');
            editingFurniture.color = e.target.dataset.color;
            saveFurniture();
        }
    });
});

// Borrar mueble y devolver dinero
document.getElementById('delete-furniture-btn').addEventListener('click', () => {
    if (editingFurniture) {
        const type = editingFurniture.type;
        const refund = furniturePrices[type] || 0;
        
        // Devolver dinero
        coinCount += refund;
        document.getElementById('coin-count').innerText = coinCount;
        
        // Eliminar del array
        homeFurniture = homeFurniture.filter(f => f !== editingFurniture);
        
        editingFurniture = null;
        selectedFurniture = null;
        document.getElementById('furniture-color-menu').classList.add('hidden');
        document.getElementById('furniture-editor').classList.add('hidden'); // Cerrar el decorador también
        saveFurniture();
    }
});

document.getElementById('close-f-color-menu').addEventListener('click', () => {
    document.getElementById('furniture-color-menu').classList.add('hidden');
    editingFurniture = null;
});

// Arrastrar muebles
canvas.addEventListener('mousedown', (e) => {
    const worldX = mouseX + camera.x;
    const worldY = mouseY + camera.y;

    // Interacción con pared de foto
    if (currentIsland.includes('_inside')) {
        const photoX = (mapSize/2)*64;
        const photoY = (mapSize/2 - 5)*64;
        // Si clickeamos cerca de la pared del fondo (ahora ocupa 704px de ancho)
        if (worldX >= photoX - 352 && worldX <= photoX + 352 && worldY >= photoY - 320 && worldY <= photoY + 64) {
             document.getElementById('photo-upload-input').click();
             return; // No mover muebles si clickeamos la pared
        }
    }

    if (document.getElementById('furniture-editor').classList.contains('hidden')) return;

    homeFurniture.forEach(f => {
        // Detección de colisión según tipo
        let hit = false;
        if (f.type === 'sofa') {
            // El sofa es 192x64 (3x1 tiles)
            hit = worldX >= f.x - 96 && worldX <= f.x + 96 && worldY >= f.y - 32 && worldY <= f.y + 32;
        } else {
            const dist = Math.hypot(worldX - f.x, worldY - f.y);
            hit = dist < 40;
        }

        if (hit) {
            selectedFurniture = f;
            editingFurniture = f; // Mantener para el menú
            document.getElementById('furniture-color-menu').classList.remove('hidden');
        }
    });
});

canvas.addEventListener('mousemove', (e) => {
    if (selectedFurniture) {
        // Snap al centro de la tile de 64x64
        selectedFurniture.x = Math.floor((mouseX + camera.x) / 64) * 64 + 32;
        selectedFurniture.y = Math.floor((mouseY + camera.y) / 64) * 64 + 32;
    }
});

canvas.addEventListener('mouseup', () => {
    if (selectedFurniture) {
        saveFurniture(); // Guardar al soltar
    }
    selectedFurniture = null;
});

// Listener para el input de fotos
document.getElementById('photo-upload-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        uploadPhoto(file);
    }
});
