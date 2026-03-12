function update(dt) {
    // --- LÓGICA DE VIAJE ---
    if (gameState === 'traveling') {
        if (isTraveling && travelTimer > 0) {
            travelTimer += dt;
            let percent = (travelTimer / TRAVEL_TIME) * 100;
            document.getElementById('flight-bar').style.width = percent + '%';
            if (travelTimer >= TRAVEL_TIME) completeTravel();
        }
        return; // Evita actualizar físicas u otros controles mientras viajas
    }

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

    // --- ZONAS Y TEXTOS ---
    if (currentIsland === 'central') {
        const cx = (mapSize / 2) * 64;
        const cy = (mapSize / 2) * 64;
        let newZone = 'Plaza Central';
        if (player.x < cx - 12 * 64) newZone = 'Barrio Oeste';
        else if (player.x > cx + 12 * 64) newZone = 'Barrio Este';
        else if (player.y < cy - 12 * 64) newZone = 'Barrio Norte';
        else if (player.y > cy + 12 * 64) newZone = 'Barrio Sur';

        if (newZone !== currentZone) {
            currentZone = newZone;
            zoneMessageTimer = 4;
        }
    } else {
        currentZone = '';
    }

    if (zoneMessageTimer > 0) {
        zoneMessageTimer -= dt;
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

    // --- COLISIÓN CON ÁRBOLES ---
    const pCenterX = player.x + player.width / 2;
    const pBaseY = player.y + player.height - 4; // Punto exacto de los pies

    treeData.forEach(tree => {
        const tX = tree.x * 64 + treeHitbox.xRel;
        const tY = tree.y * 64 + treeHitbox.yRel;

        // --- HITBOX RECTANGULAR ESTABLE (MTV) ---
        const halfW = treeHitbox.w / 2;
        const halfH = treeHitbox.h / 2;

        // Pies del jugador ( hitbox de 10x8 centrada en pCenterX, pBaseY )
        const pWh = 5; // Half width
        const pHh = 4; // Half height

        const dx = pCenterX - tX;
        const dy = pBaseY - tY;

        const overlapX = (halfW + pWh) - Math.abs(dx);
        const overlapY = (halfH + pHh) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
            // Resolver por el eje de menor penetración para evitar saltos locos
            if (overlapX < overlapY) {
                player.x += (dx > 0 ? overlapX : -overlapX);
                player.vx = 0;
            } else {
                player.y += (dy > 0 ? overlapY : -overlapY);
                player.vy = 0;
            }
        }
    });

    // Actualizar Cámara de forma SUAVE (Lerp)
    const targetCamX = player.x - canvas.width / 2 + player.width / 2;
    const targetCamY = player.y - canvas.height / 2 + player.height / 2;

    // Si la cámara acaba de aparecer o está muy lejos, cortamos directamente
    if (Math.abs(targetCamX - camera.x) > 1000) {
        camera.x = targetCamX;
        camera.y = targetCamY;
    } else {
        camera.x += (targetCamX - camera.x) * 5 * dt;
        camera.y += (targetCamY - camera.y) * 5 * dt;
    }

    // Animación con DeltaTime
    if (player.isMoving) {
        player.frameTimer += dt;
        player.idleTime = 0;
        if (player.frameTimer > player.frameDuration) {
            player.frame = (player.frame + 1) % totalFrames;
            player.frameTimer = 0;
        }
    } else {
        player.frame = 0; // Primer frame como posición de reposo (Idle en 1)
        player.idleTime = (player.idleTime || 0) + dt;
    }

    // Interacción
    currentActionPrompt = null;
    const isInside = currentIsland.endsWith('_inside');
    if (!isInside) {
        const distPlane = Math.hypot(player.x - (planeX * 64 + 32), player.y - (planeY * 64 + 32));
        if (distPlane < 100 && !isTraveling && gameState === 'playing') {
            currentActionPrompt = "[ENTER] Viajar";
            if (keys['Enter']) {
                openTravelMenu();
                keys['Enter'] = false;
            }
        }

        if (islandFeatures.house) {
            const hx = islandFeatures.house.x * 64;
            const hy = islandFeatures.house.y * 64;
            const distHouse = Math.hypot(player.x - (hx + 64), player.y - (hy + 155));
            if (distHouse < 80 && !isTraveling && gameState === 'playing') {
                currentActionPrompt = "[ENTER] Entrar";
                if (keys['Enter']) {
                    enterHouse(currentIsland);
                    keys['Enter'] = false;
                }
            }
        }
    } else {
        const doorX = (mapSize/2)*64;
        const doorY = (mapSize/2 + 5)*64;
        const distDoor = Math.hypot(player.x - doorX, player.y - doorY);
        if (distDoor < 80 && !isTraveling && gameState === 'playing') {
            currentActionPrompt = "[ENTER] Salir";
            if (keys['Enter']) {
                exitHouse();
                keys['Enter'] = false;
            }
        }
    }

    // --- LÓGICA DE MONSTRUO FAKER ---
    const isNightForFaker = (worldTime >= 18 || worldTime < 6);
    if (!isInside && isNightForFaker && gameState === 'playing') {
        if (!faker.active) {
            faker.active = true;
            // Spawn lejos del jugador
            const angle = Math.random() * Math.PI * 2;
            const distance = 1000 + Math.random() * 500;
            faker.x = player.x + Math.cos(angle) * distance;
            faker.y = player.y + Math.sin(angle) * distance;
        }

        // Mover hacia el jugador
        const dx = player.x - faker.x;
        const dy = player.y - faker.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            let fvx = (dx / dist) * faker.speed;
            let fvy = (dy / dist) * faker.speed;
            
            faker.vx += fvx * dt;
            faker.vy += fvy * dt;

            // Fricción y max speed (similar a jugador)
            const frictionF = Math.pow(0.9, dt * 60);
            faker.vx *= frictionF;
            faker.vy *= frictionF;

            const curSpeed = Math.hypot(faker.vx, faker.vy);
            if (curSpeed > faker.maxSpeed) {
                faker.vx *= (faker.maxSpeed / curSpeed);
                faker.vy *= (faker.maxSpeed / curSpeed);
            }

            faker.x += faker.vx * dt;
            faker.y += faker.vy * dt;
            
            faker.isMoving = curSpeed > 10;
            
            // Dirección
            if (Math.abs(dx) > Math.abs(dy)) {
                faker.direction = dx > 0 ? 'right' : 'left';
            } else {
                faker.direction = dy > 0 ? 'forward' : 'up';
            }

            // Animación
            if (faker.isMoving) {
                faker.frameTimer += dt;
                if (faker.frameTimer > faker.frameDuration) {
                    faker.frame = (faker.frame + 1) % totalFrames;
                    faker.frameTimer = 0;
                }
            } else {
                faker.frame = 0;
            }

            // Dañar al jugador
            if (dist < 40) { // Muy cerca
                stats.health -= 60 * dt; // Pierdes 60 puntos de vida por segundo
                if (stats.health <= 0) {
                    stats.health = 0;
                    gameState = 'dead';
                    setTimeout(() => {
                        window.location.reload();
                    }, 4000);
                }
            }
        }
    } else {
        faker.active = false;
    }
}

