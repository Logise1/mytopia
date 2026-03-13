function update(dt) {
    const isInside = currentIsland.includes('_inside');

    // --- LÓGICA DE VIAJE ---
    if (gameState === 'traveling') {
        const menuEl = document.getElementById('travel-menu');
        const takeoffTime = 8;
        const landStartTime = TRAVEL_TIME - takeoffTime;

        if (isTraveling && travelTimer > 0) {
            let prevTimer = travelTimer;
            travelTimer += dt;
            let percent = (travelTimer / TRAVEL_TIME) * 100;
            document.getElementById('flight-bar').style.width = percent + '%';
            
            // Actualizar minimapa de vuelo
            const planeEmoji = document.getElementById('travel-plane-emoji');
            if (planeEmoji) {
                // El plane se mueve del 10% al 90% del contenedor
                const movePercent = 10 + (percent * 0.8);
                planeEmoji.style.left = movePercent + '%';
            }
            
            if (prevTimer <= takeoffTime && travelTimer > takeoffTime) {
                generateIsland(targetTravelIsland);
                // Mover a zona segura en lugar de coordenadas negativas extremas que pueden fallar
                player.x = (mapSize/2)*64;
                player.y = (mapSize/2)*64;

                // Fade out takeoffPlane, y fade in planeAmbience
                if (audioAssets.takeoffPlane && !audioAssets.takeoffPlane.paused) {
                    let fo = setInterval(() => {
                        if (audioAssets.takeoffPlane.volume > 0.05) audioAssets.takeoffPlane.volume -= 0.05;
                        else { audioAssets.takeoffPlane.pause(); audioAssets.takeoffPlane.volume = 1; clearInterval(fo); }
                    }, 100);
                }
                if (audioAssets.planeAmbience) {
                    let fi = setInterval(() => {
                        if (audioAssets.planeAmbience.volume < 0.95) audioAssets.planeAmbience.volume += 0.05;
                        else { audioAssets.planeAmbience.volume = 1; clearInterval(fi); }
                    }, 100);
                }
            }
            
            if (prevTimer <= landStartTime && travelTimer > landStartTime) {
                // Fade out planeAmbience, iniciar landPlane a topo (Crossfade visual a la animacion de aterrizaje)
                if (audioAssets.landPlane) {
                    audioAssets.landPlane.currentTime = 0;
                    audioAssets.landPlane.volume = 1;
                    audioAssets.landPlane.play().catch(e => console.log(e));
                }
                if (audioAssets.planeAmbience && !audioAssets.planeAmbience.paused) {
                    let fo = setInterval(() => {
                        if (audioAssets.planeAmbience.volume > 0.05) audioAssets.planeAmbience.volume -= 0.05;
                        else { audioAssets.planeAmbience.pause(); audioAssets.planeAmbience.volume = 1; clearInterval(fo); }
                    }, 100);
                }
                if (audioAssets.takeoffPlane && !audioAssets.takeoffPlane.paused) {
                    audioAssets.takeoffPlane.pause();
                }
            }
            
            if (travelTimer >= TRAVEL_TIME) completeTravel();
        }

        let targetCamX = camera.x;
        let targetCamY = camera.y;

        if (travelTimer <= takeoffTime) {
            const rawT = travelTimer / takeoffTime;
            const t = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;
            
            targetCamX = (planeX * 64) + (t * 600) - canvas.width / 2 + 60;
            targetCamY = (planeY * 64) - (t * 800) - canvas.height / 2 + 60;
            
            if (menuEl) menuEl.classList.add('hidden');
        } else if (travelTimer >= landStartTime) {
            const rawT = (TRAVEL_TIME - travelTimer) / takeoffTime;
            const t = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;
            
            targetCamX = (planeX * 64) - (t * 600) - canvas.width / 2 + 60;
            targetCamY = (planeY * 64) - (t * 800) - canvas.height / 2 + 60;
            
            if (travelTimer - dt < landStartTime) {
                camera.x = targetCamX;
                camera.y = targetCamY;
            }
            if (menuEl) menuEl.classList.add('hidden');
        } else {
            // Fase central abordo
            if (menuEl) {
                menuEl.classList.remove('hidden');
                menuEl.classList.add('cabin-mode');
            }
        }
        
        // Seguimiento directo de la cámara para evitar el "bugeado" de retardo
        camera.x = targetCamX;
        camera.y = targetCamY;

        return; // Evita actualizar físicas u otros controles mientras viajas
    }

    // Interpolación de otros jugadores
    for (let uid in multiplayer.players) {
        const p = multiplayer.players[uid];
        // Lerp simple para suavidad (10% del camino por frame a 60fps aprox)
        p.x += (p.targetX - p.x) * 10 * dt;
        p.y += (p.targetY - p.y) * 10 * dt;
    }

    if (gameState !== 'playing' && gameState !== 'customizing') return;

    let ax = 0;
    let ay = 0;
    let inputMoving = false;

    // Actualizar estado social dinámico
    if (isTraveling) multiplayer.status = "Viajando en avión...";
    else if (currentIsland.includes('_inside')) multiplayer.status = "En casa";
    else if (faker.active && faker.spawnState === 'chasing') multiplayer.status = "¡Huyendo del Faker!";
    else if (player.isMoving) multiplayer.status = "Caminando por " + currentIsland;
    else multiplayer.status = "Descansando en " + currentIsland;

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

    // --- LÓGICA DE EMOTES ---
    if (keys['Digit1'] && !player.emote.active) {
        player.emote.active = true;
        player.emote.frame = 0;
        player.emote.timer = 0;
        multiplayer.status = "Haciendo un baile...";
        
        // Sincronizar audio
        if (audioAssets.emoteAudio) {
            audioAssets.emoteAudio.currentTime = 0;
            audioAssets.emoteAudio.play().catch(e => console.log("Audio emote error:", e));
        }
        
        // Envío inmediato a multiplayer
        multiplayer.lastSend = 0;
    }

    if (player.emote.active) {
        if (audioAssets.emoteAudio && player.emote.frames.length > 0) {
            // Sincronización milimétrica
            const currentAudioTime = audioAssets.emoteAudio.currentTime;
            const currentAudioFrame = Math.floor(currentAudioTime / player.emote.duration);
            
            // Mantenemos el último frame si el audio sigue sonando
            player.emote.frame = Math.min(currentAudioFrame, player.emote.frames.length - 1);

            // Solo terminamos cuando el audio llega al final de verdad
            if (audioAssets.emoteAudio.ended) {
                player.emote.active = false;
                player.emote.frame = 0;
                multiplayer.lastSend = 0;
            }
        } else if (player.emote.active && player.emote.frames.length === 0) {
            player.emote.active = false;
        }
        
        // Si el jugador se mueve, cancelamos el emote
        if (inputMoving) {
            player.emote.active = false;
            // Parar sonido si se cancela
            if (audioAssets.emoteAudio) {
                audioAssets.emoteAudio.pause();
                audioAssets.emoteAudio.currentTime = 0;
            }
            multiplayer.lastSend = 0; // Envío inmediato al cancelar
        }
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

    // Guardar posición anterior para resolver colisiones
    const oldX = player.x;
    const oldY = player.y;

    // --- MOVIMIENTO EN X ---
    player.x += player.vx * dt;
    resolveMapCollisions(true, oldX);

    // --- MOVIMIENTO EN Y ---
    player.y += player.vy * dt;
    resolveMapCollisions(false, oldY);

    // --- COLISIÓN CON ÁRBOLES ---
    const pCenterX = player.x + player.width / 2;
    const pBaseY = player.y + player.height - 4; // Punto exacto de los pies

    treeData.forEach(tree => {
        const tX = tree.x * 64 + treeHitbox.xRel;
        const tY = tree.y * 64 + treeHitbox.yRel;
        const halfW = treeHitbox.w / 2;
        const halfH = treeHitbox.h / 2;
        const pWh = 5; 
        const pHh = 4; 
        const dx = pCenterX - tX;
        const dy = pBaseY - tY;
        const overlapX = (halfW + pWh) - Math.abs(dx);
        const overlapY = (halfH + pHh) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
                player.x += (dx > 0 ? overlapX : -overlapX);
                player.vx = 0;
            } else {
                player.y += (dy > 0 ? overlapY : -overlapY);
                player.vy = 0;
            }
        }
    });

    // --- COLISIÓN CON PALMERAS ---
    palmtreeData.forEach(tree => {
        const tX = tree.x * 64 + palmtreeHitbox.xRel;
        const tY = tree.y * 64 + palmtreeHitbox.yRel;
        const halfW = palmtreeHitbox.w / 2;
        const halfH = palmtreeHitbox.h / 2;
        const pWh = 5; 
        const pHh = 4; 
        const dx = pCenterX - tX;
        const dy = pBaseY - tY;
        const overlapX = (halfW + pWh) - Math.abs(dx);
        const overlapY = (halfH + pHh) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
                player.x += (dx > 0 ? overlapX : -overlapX);
                player.vx = 0;
            } else {
                player.y += (dy > 0 ? overlapY : -overlapY);
                player.vy = 0;
            }
        }
    });
    // --- COLISIÓN CON CASA ---
    if (islandFeatures.house) {
        const hX = islandFeatures.house.x * 64 + houseHitbox.xRel;
        const hY = islandFeatures.house.y * 64 + houseHitbox.yRel;
        const halfW = houseHitbox.w / 2;
        const halfH = houseHitbox.h / 2;
        const pWh = 5;
        const pHh = 4;
        const dx = pCenterX - hX;
        const dy = pBaseY - hY;
        const overlapX = (halfW + pWh) - Math.abs(dx);
        const overlapY = (halfH + pHh) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
                player.x += (dx > 0 ? overlapX : -overlapX);
                player.vx = 0;
            } else {
                player.y += (dy > 0 ? overlapY : -overlapY);
                player.vy = 0;
            }
        }
    }
    // --- COLISIÓN CON AVIÓN ---
    if (!isInside && planeX !== 0) {
        const aX = planeX * 64 + planeHitbox.xRel;
        const aY = planeY * 64 + planeHitbox.yRel;

        const halfW = planeHitbox.w / 2;
        const halfH = planeHitbox.h / 2;

        const dx = pCenterX - aX;
        const dy = pBaseY - aY;

        const overlapX = (halfW + 5) - Math.abs(dx);
        const overlapY = (halfH + 4) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
                player.x += (dx > 0 ? overlapX : -overlapX);
                player.vx = 0;
            } else {
                player.y += (dy > 0 ? overlapY : -overlapY);
                player.vy = 0;
            }
        }
    }

    // Actualizar Cámara de forma SUAVE (Lerp)


    // Actualizar Zoom de Cámara de forma SUAVE (Lerp)
    camera.targetZoom = player.emote.active ? 1.25 : 1.0;
    camera.zoom += (camera.targetZoom - camera.zoom) * 5 * dt;

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
    if (!isInside) {
        const distPlane = Math.hypot(player.x - (planeX * 64 + 32), player.y - (planeY * 64 + 32));
        if (distPlane < 100 && !isTraveling && gameState === 'playing') {
            currentActionPrompt = "[ENTER/X] Viajar";
            if (keys['Enter'] || keys['NumpadEnter'] || keys['KeyX']) {
                openTravelMenu();
                keys['Enter'] = false;
                keys['KeyX'] = false;
            }
        }

        if (islandFeatures.house) {
            const hx = islandFeatures.house.x * 64;
            const hy = islandFeatures.house.y * 64;
            // El punto de la puerta es aproximadamente hx+64, hy+80 (base visual)
            const distHouse = Math.hypot(player.x - (hx + 64), player.y - (hy + 100));
            if (distHouse < 100 && !isTraveling && gameState === 'playing') {
                currentActionPrompt = "[ENTER/X] Entrar | [R] Casa";
                if (keys['Enter'] || keys['NumpadEnter'] || keys['KeyX']) {
                    enterHouse(currentIsland);
                    keys['Enter'] = false;
                    keys['KeyX'] = false;
                }
                if (keys['KeyR']) {
                    gameState = 'customizing';
                    document.getElementById('house-menu').classList.remove('hidden');
                    keys['KeyR'] = false;
                }
            }
        }
    } else {
        const doorX = (mapSize/2)*64;
        const doorY = (mapSize/2 + 5)*64;
        const distDoor = Math.hypot(player.x - doorX, player.y - doorY);
        if (distDoor < 80 && !isTraveling && gameState === 'playing') {
            currentActionPrompt = "[ENTER/X] Salir";
            if (keys['Enter'] || keys['NumpadEnter'] || keys['KeyX']) {
                exitHouse();
                keys['Enter'] = false;
                keys['KeyX'] = false;
            }
        }

        // --- LÓGICA DE PARED DE FOTO ---
        const photoX = (mapSize/2)*64;
        const photoY = (mapSize/2 - 5.5)*64; 
        const distPhoto = Math.hypot(player.x - photoX, player.y - photoY);
        if (distPhoto < 120 && gameState === 'playing') {
            currentActionPrompt = "Haz click en la pared para subir una foto";
        }
    }

    // --- LÓGICA DE MONSTRUO FAKER ---
    const isNightForFaker = (worldTime >= 18 || worldTime < 6);
    const canSpawnFaker = !isInside && isNightForFaker && gameState === 'playing' && !isTraveling;

    if (faker.active && !canSpawnFaker) {
        faker.active = false;
        faker.spawnState = 'hidden';
        faker.strength = 0;
    }

    if (canSpawnFaker) {
        if (!faker.active) {
            // Inicializar tiempo de espera aleatorio si no se ha hecho
            if (faker.spawnWait <= 0) {
                faker.spawnWait = 5 + Math.random() * 5; // 5-10 segundos
            }
            
            faker.spawnWait -= dt;
            
            if (faker.spawnWait <= 0) {
                faker.active = true;
                faker.spawnState = 'enter1';
                faker.spawnTimer = 0.5;
                // Spawning specifically ABOVE the player as requested
                faker.x = player.x;
                faker.y = player.y - 200; // 200 pixels arriba, bien visible
                faker.vx = 0;
                faker.vy = 0;
            }
        }

        if (faker.active && faker.spawnState !== 'chasing') {
            faker.spawnTimer -= dt;
            if (faker.spawnTimer <= 0) {
                if (faker.spawnState === 'enter1') {
                    faker.spawnState = 'enter2';
                    faker.spawnTimer = 0.5;
                } else if (faker.spawnState === 'enter2') {
                    faker.spawnState = 'enter3';
                    faker.spawnTimer = 0.2;
                } else if (faker.spawnState === 'enter3') {
                    faker.spawnState = 'chasing';
                }
            }
        }

        if (faker.spawnState === 'chasing') {
            const dx = player.x - faker.x;
            const dy = player.y - faker.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0) {
                // Rango de visión: si se aleja demasiado, se pierde
                if (dist > faker.visionRange) {
                    faker.active = false;
                    faker.spawnState = 'hidden';
                    faker.spawnWait = 10 + Math.random() * 10; // Tarda más en volver si se "pierde"
                    return;
                }

                // Cálculo de fuerza (0 a 1)
                faker.strength = 1 - (dist / faker.visionRange);
                faker.strength = Math.max(0, Math.min(1, faker.strength));

                let fvx = (dx / dist) * faker.speed;
                let fvy = (dy / dist) * faker.speed;
                faker.vx += fvx * dt;
                faker.vy += fvy * dt;
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
                if (Math.abs(dx) > Math.abs(dy)) {
                    faker.direction = dx > 0 ? 'right' : 'left';
                } else {
                    faker.direction = dy > 0 ? 'forward' : 'up';
                }
            }

            if (faker.isMoving) {
                faker.frameTimer += dt;
                if (faker.frameTimer > faker.frameDuration) {
                    faker.frame = (faker.frame + 1) % totalFrames;
                    faker.frameTimer = 0;
                }
            } else {
                faker.frame = 0;
            }

            if (dist < 40) { // Mayor rango para compensar la velocidad
                stats.health -= 25 * dt; // Daño más letal
                if (stats.health <= 0) {
                    stats.health = 0;
                    gameState = 'dead';
                    setTimeout(() => { window.location.reload(); }, 4000);
                }
            }
        } else {
            faker.vx = 0;
            faker.vy = 0;
            faker.isMoving = false;
        }
    } else {
        faker.active = false;
        faker.spawnState = 'hidden';
        faker.spawnWait = 0; 
    }

    // --- LÓGICA DE AUDIO (Ambiente y Persecución) ---
    if (audioAssets.ambience && audioAssets.chase && audioAssets.dayMusic) {
        audioAssets.ambience.loop = true;
        audioAssets.chase.loop = true;
        audioAssets.dayMusic.loop = true;
        
        // Restore day music volume in case it was lowered by the plane fadeout
        if (audioAssets.dayMusic.volume < musicVolume && gameState === 'playing' && !isTraveling) {
            audioAssets.dayMusic.volume = Math.min(musicVolume, audioAssets.dayMusic.volume + dt * 0.5);
        }
        
        let playNightTheme = false;
        let playDayTheme = false;
        
        if (gameState === 'playing' && !isTraveling && !currentIsland.includes('_inside')) {
            const nowH = worldTime;
            if (nowH >= 18 || nowH < 6) {
                playNightTheme = true;
            } else {
                playDayTheme = true;
            }
        }

        if (playNightTheme) {
            if (!audioAssets.dayMusic.paused) audioAssets.dayMusic.pause();
            
            if (faker && faker.active && faker.spawnState === 'chasing') {
                if (!audioAssets.ambience.paused) audioAssets.ambience.pause();
                if (audioAssets.chase.paused) {
                    audioAssets.chase.currentTime = 0; // en cuanto salte persecucion
                    audioAssets.chase.play().catch(e => console.log(e));
                }
            } else {
                if (!audioAssets.chase.paused) audioAssets.chase.pause();
                if (audioAssets.ambience.paused) {
                    audioAssets.ambience.play().catch(e => console.log(e));
                }
            }
        } else if (playDayTheme) {
            if (!audioAssets.ambience.paused) audioAssets.ambience.pause();
            if (!audioAssets.chase.paused) audioAssets.chase.pause();
            
            if (audioAssets.dayMusic.paused) {
                audioAssets.dayMusic.play().catch(e => console.log(e));
            }
        } else {
            // Ni de dia ni de noche en el exterior (ej. viajando o dentro de casa)
            if (!isTraveling) { // Si viaja, travel.js o su propio tick puede hacer un fadeOut, así que solo pausamos si NO está viajando para evitar cortarlo brusco antes del fade
               if (!audioAssets.dayMusic.paused) audioAssets.dayMusic.pause();
               if (!audioAssets.ambience.paused) audioAssets.ambience.pause();
               if (!audioAssets.chase.paused) audioAssets.chase.pause();
            }
        }
    }
}

function resolveMapCollisions(isX, oldVal) {
    const pW = 44; // Ancho efectivo de colisión (pies)
    const checkPoints = [
        { x: player.x + (player.width - pW) / 2, y: player.y + player.height - 2 },
        { x: player.x + (player.width + pW) / 2, y: player.y + player.height - 2 }
    ];

    let collided = false;
    checkPoints.forEach(pt => {
        const tx = Math.floor(pt.x / 64);
        const ty = Math.floor(pt.y / 64);

        if (tx >= 0 && tx < mapSize && ty >= 0 && ty < mapSize) {
            const tile = mapData[ty][tx];
            const isDockArea = islandFeatures.dock && tx === islandFeatures.dock.x && ty === islandFeatures.dock.y;
            const isPlaneDock = tx >= planeX - 1 && tx <= planeX + 1 && ty === planeY;
            
            let walkable = false;
            const inside = currentIsland.includes('_inside');
            
            if (inside) {
                walkable = tile === 'woodFloor';
            } else {
                walkable = tile === 'grass' || tile === 'sand' || tile.startsWith('grass-sand') || 
                           tile.startsWith('brik') || isDockArea || isPlaneDock;
            }

            if (!walkable) collided = true;
        } else {
            const inside = currentIsland.includes('_inside');
            if (!inside) collided = true;
        }
    });

    if (collided) {
        if (isX) {
            player.x = oldVal;
            player.vx = 0;
        } else {
            player.y = oldVal;
            player.vy = 0;
        }
    }
}

