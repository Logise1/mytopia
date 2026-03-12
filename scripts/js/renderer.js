function drawTiles() {
    const tileSize = 64;

    const startX = Math.floor(camera.x / tileSize);
    const startY = Math.floor(camera.y / tileSize);
    const endX = startX + Math.ceil(canvas.width / tileSize) + 1;
    const endY = startY + Math.ceil(canvas.height / tileSize) + 1;

    for (let ty = startY; ty < endY; ty++) {
        for (let tx = startX; tx < endX; tx++) {
            const mx = ((tx % mapSize) + mapSize) % mapSize;
            const my = ((ty % mapSize) + mapSize) % mapSize;

            let tileType = mapData[my][mx];
            const drawX = tx * tileSize - camera.x;
            const drawY = ty * tileSize - camera.y;

            if (tileAssets.isLoaded) {
                let rotation = 0;
                let finalType = tileType;

                if (tileType.startsWith('grass-sand-diagonal')) {
                    finalType = 'grass-sand-diagonal';
                    rotation = Math.PI; // Base (Top-Left) girada 180
                    if (tileType.endsWith('_TR')) rotation = Math.PI * 1.5; // Top-Right (+90)
                    if (tileType.endsWith('_BR')) rotation = 0;             // Bottom-Right (+180)
                    if (tileType.endsWith('_BL')) rotation = Math.PI * 0.5; // Bottom-Left (+270)
                } else if (tileType.startsWith('wave_')) {
                    // Animación de la marea: desfasada por posición (mx + my) pero con un pulso temporal constante cada 400ms
                    const offset = (mx + my) % 3;
                    const frame = (Math.floor(performance.now() / 400) + offset) % 3 + 1;
                    finalType = 'wave' + frame;
                    const parts = tileType.split('_');
                    const dir = parts[1];
                    if (dir === 'S') rotation = 0;               // Arena arriba, agua abajo
                    if (dir === 'W') rotation = Math.PI * 0.5;   // Arena derecha, agua izq (Esquivando CSS, rotación horaria de img base)
                    if (dir === 'N') rotation = Math.PI;         // Arena abajo, agua arriba
                    if (dir === 'E') rotation = Math.PI * 1.5;   // Arena izquierda, agua derecha
                } else if (tileType.startsWith('wave4')) {
                    finalType = 'wave4';
                    const dir = tileType.split('_')[1];
                    // 'wave4' base: Arena en esquina Top-Left. Corresponde a la esquina Bottom-Right exterior de la isla
                    if (dir === 'BR') rotation = 0;             
                    if (dir === 'BL') rotation = Math.PI * 0.5; 
                    if (dir === 'TL') rotation = Math.PI;       
                    if (dir === 'TR') rotation = Math.PI * 1.5; 
                } else if (tileType === 'water') {
                    // Animación ciclada para el agua base (4 sprites)
                    const offset = (mx + my) % 4;
                    const frame = (Math.floor(performance.now() / 400) + offset) % 4 + 1;
                    finalType = 'water' + frame;
                }

                const img = tileAssets[finalType];
                if (img && img.complete && img.naturalWidth !== 0) {
                    if (rotation !== 0) {
                        ctx.save();
                        ctx.translate(drawX + tileSize / 2, drawY + tileSize / 2);
                        ctx.rotate(rotation);
                        ctx.drawImage(img, -tileSize / 2, -tileSize / 2, tileSize, tileSize);
                        ctx.restore();
                    } else {
                        ctx.drawImage(img, drawX, drawY, tileSize, tileSize);
                    }
                } else {
                     if (tileType === 'black') ctx.fillStyle = '#111';
                     else if (tileType === 'woodFloor') ctx.fillStyle = '#654321';
                     else ctx.fillStyle = tileType.includes('grass') ? '#2d5a27' : ((tileType.includes('water') || tileType.includes('wave')) ? '#0f5e9c' : '#d2b48c');
                     
                     ctx.fillRect(drawX, drawY, tileSize, tileSize);
                     
                     if (tileType === 'woodFloor') {
                         ctx.strokeStyle = '#5c3a1e';
                         ctx.lineWidth = 2;
                         ctx.strokeRect(drawX, drawY, tileSize, tileSize);
                     }
                }
            } else {
                ctx.fillStyle = tileType.includes('grass') ? '#2d5a27' : ((tileType.includes('water') || tileType.includes('wave')) ? '#0f5e9c' : '#d2b48c');
                ctx.fillRect(drawX, drawY, tileSize, tileSize);
            }
        }
    }
}

function getSunlightTransform() {
    let timeOffset = worldTime - 12;
    if (timeOffset < -12) timeOffset += 24;
    if (timeOffset > 12) timeOffset -= 24;

    const skewAmount = (timeOffset / 6);
    const scaleAmount = 0.15 + (Math.abs(timeOffset) / 12) * 0.5;

    let alpha = 0.5;
    if (worldTime > 20 || worldTime < 4) alpha = 0.2;
    else if (worldTime >= 10 && worldTime <= 14) alpha = 0.6;

    return { skewAmount, scaleAmount, alpha };
}

function drawTreeShadows() {
    if (!tileAssets.isLoaded || !treeAsset.complete || treeAsset.naturalWidth === 0) return;
    const tileSize = 64;

    if (!treeShadowCanvas) {
        treeShadowCanvas = document.createElement('canvas');
        treeShadowCanvas.width = treeAsset.naturalWidth;
        treeShadowCanvas.height = treeAsset.naturalHeight;
        const sCtx = treeShadowCanvas.getContext('2d');
        sCtx.drawImage(treeAsset, 0, 0);
        sCtx.globalCompositeOperation = 'source-in';
        sCtx.fillStyle = '#0f0514';
        sCtx.fillRect(0, 0, treeShadowCanvas.width, treeShadowCanvas.height);
    }

    const sun = getSunlightTransform();

    ctx.save();
    ctx.globalAlpha = sun.alpha;

    treeData.forEach(tree => {
        const drawX = tree.x * tileSize - camera.x;
        const drawY = tree.y * tileSize - camera.y;

        if (drawX > -tileSize * 6 && drawX < canvas.width + tileSize * 6 && drawY > -tileSize * 6 && drawY < canvas.height + tileSize * 6) {
            const treeW = tileSize * 2.5;
            const treeH = tileSize * 3.0;

            // Punto pivote: subimos la sombra un poco (-15px) para mejor perspectiva
            const baseX = drawX + treeHitbox.xRel;
            const baseY = drawY + treeHitbox.yRel + treeHitbox.h / 2 - 15;

            ctx.save();
            ctx.translate(baseX, baseY);
            ctx.transform(1, 0, sun.skewAmount, sun.scaleAmount, 0, 0);

            const imgLeft = (drawX - (treeW - tileSize) / 2) - baseX;
            const imgTop = (drawY - (treeH - tileSize)) - baseY;

            ctx.drawImage(treeShadowCanvas, imgLeft, imgTop, treeW, treeH);
            ctx.restore();
        }
    });

    ctx.restore();
}

function drawPlayerShadows() {
    const sun = getSunlightTransform();
    const shadowColor = '#0f0514'; // Mismo tono que el árbol

    // Reunimos a todos en un array
    const entities = [
        { ...player, isLocal: true, screenX: player.x - camera.x, screenY: player.y - camera.y, u_uid: 'local' }
    ];
    for (let uid in multiplayer.players) {
        const p = multiplayer.players[uid];
        entities.push({
            ...p, isLocal: false,
            screenX: p.x - camera.x, screenY: p.y - camera.y,
            width: player.width, height: player.height,
            direction: p.direction || player.direction,
            u_uid: uid
        });
    }

    ctx.save();
    ctx.globalAlpha = sun.alpha;

    entities.forEach(ent => {
        if (ent.screenX < -100 || ent.screenX > canvas.width + 100 || ent.screenY < -100 || ent.screenY > canvas.height + 100) return;

        const anim = player.animations[ent.direction];
        const frameData = anim ? anim[Math.floor(ent.frame || 0)] : null;

        let scaleX = 1; let scaleY = 1;
        let baseHeight = ent.height; let baseWidth = ent.width;
        let jumpOffset = 0;

        if (frameData && frameData.original) {
            const aspect = frameData.original.width / frameData.original.height;
            baseWidth = baseHeight * aspect;
        }

        // Lógica de rebote multi-jugador para el LERP más directo
        if (ent.isMoving) {
            const jumpProgress = (performance.now() % 500) / 500; // Un ciclo simple de rebote basado en tiempo si isMoving es true
            const bounce = Math.abs(Math.sin(jumpProgress * Math.PI)); // Un arco suavizado de 0 a 1 y vuelta a 0
            jumpOffset = -bounce * 10;
            const s = (bounce - 0.5) * 0.1;
            scaleY = 1 + s; scaleX = 1 - s;
        }

        const drawW = baseWidth * scaleX;
        const drawH = baseHeight * scaleY;
        const drawX = ent.screenX + (ent.width - drawW) / 2;
        const drawY = ent.screenY + (ent.height - drawH) + jumpOffset;

        if (frameData && frameData.processed) {
            // Silhouette
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = frameData.processed.width;
            tempCanvas.height = frameData.processed.height;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(frameData.processed, 0, 0);
            tCtx.globalCompositeOperation = 'source-in';
            tCtx.fillStyle = shadowColor;
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            const baseX = drawX + drawW / 2;
            const baseY = ent.screenY + ent.height;

            ctx.save();
            ctx.translate(baseX, baseY);
            ctx.transform(1, 0, sun.skewAmount, sun.scaleAmount, 0, 0);

            const imgLeft = drawX - baseX;
            const imgTop = drawY - baseY;

            ctx.drawImage(tempCanvas, imgLeft, imgTop, drawW, drawH);
            ctx.restore();
        } else {
            // Fallback
            ctx.fillStyle = shadowColor;
            ctx.beginPath();
            ctx.ellipse(ent.screenX + ent.width / 2, ent.screenY + ent.height, 22, 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.restore();
}

function drawSingleTree(tree, tileSize) {
    if (!tileAssets.isLoaded) return;

    const drawX = tree.x * tileSize - camera.x;
    const drawY = tree.y * tileSize - camera.y;

    // Solo dibujar si está cerca de la pantalla
    if (drawX > -tileSize * 4 && drawX < canvas.width + tileSize * 4 && drawY > -tileSize * 6 && drawY < canvas.height + tileSize * 4) {
        const treeW = tileSize * 2.5;
        const treeH = tileSize * 3.0;
        ctx.drawImage(treeAsset, drawX - (treeW - tileSize) / 2, drawY - (treeH - tileSize), treeW, treeH);

        // Visualizar Hitbox si está en modo Debug
        if (debug.active) {
            const hX = drawX + treeHitbox.xRel;
            const hY = drawY + treeHitbox.yRel;
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.strokeRect(hX - treeHitbox.w / 2, hY - treeHitbox.h / 2, treeHitbox.w, treeHitbox.h);
        }
    }
}

function drawSinglePalmtree(tree, tileSize) {
    if (!palmtreeAsset.complete) return;

    let wx = tree.x * tileSize;
    let wy = tree.y * tileSize;

    const screenX = wx - camera.x;
    const screenY = wy - camera.y;

    if (screenX < -256 || screenX > canvas.width || screenY < -256 || screenY > canvas.height) return;

    // Dibujar palmera normal desde su base
    ctx.drawImage(palmtreeAsset, screenX - 64, screenY - 128, 192, 192);

    if (debug.active) {
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX + treeHitbox.xRel - treeHitbox.w / 2, screenY + treeHitbox.yRel - treeHitbox.h / 2, treeHitbox.w, treeHitbox.h);
    }
}

function drawPlayer() {
    // Usamos las animaciones con el color activo cacheadas
    const animSet = getSkinAnimations(skinColor);
    const anim = animSet[player.direction];
    const frameData = anim ? anim[Math.floor(player.frame)] : null;

    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    let jumpOffset = 0;
    let scaleX = 1;
    let scaleY = 1;

    // Mantener relación de aspecto original
    let baseHeight = player.height;
    let baseWidth = player.width;

    if (frameData && frameData.original) {
        const aspect = frameData.original.width / frameData.original.height;
        baseWidth = baseHeight * aspect;
    }

    if (player.isMoving) {
        const cycleProgress = (player.frame + (player.frameTimer / player.frameDuration)) / 6;
        const bounce = Math.abs(Math.sin(cycleProgress * Math.PI * 2));

        jumpOffset = -bounce * 10; // Un poco menos de salto

        // Squash and Stretch más sutil
        const s = (bounce - 0.5) * 0.1;
        scaleY = 1 + s;
        scaleX = 1 - s;
    } else {
        // Respiración suave en Idle (Squash & Stretch en reposo)
        const breath = Math.sin((player.idleTime || 0) * 3);
        scaleY = 1 + breath * 0.02; // Sube/baja un 2%
        scaleX = 1 - breath * 0.01; // Ensancha un 1% inverso
    }

    const drawW = baseWidth * scaleX;
    const drawH = baseHeight * scaleY;

    // Ajustar posición para que la base esté equilibrada
    const drawX = screenX + (player.width - drawW) / 2;
    const drawY = screenY + (player.height - drawH) + jumpOffset;

    // Death animation logic (rotated + reddish)
    if (gameState === 'dead') {
        ctx.save();
        ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
        ctx.rotate(Math.PI / 2); // Rotate 90 degrees
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frameData.processed, -drawW / 2, -drawH / 2, drawW, drawH);
        
        // Add a red tint over the player
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        
        ctx.restore();
    } else {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frameData.processed, drawX, drawY, drawW, drawH);
    }

    // Visualizar Hitbox del Jugador si está en modo Debug
    if (debug.active) {
        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX + player.width / 2 - 5, screenY + player.height - 8, 10, 8); // Punto de colisión (pies)
    }

    // Dibujar nombre local sobre la cabeza
    if (multiplayer.username && gameState !== 'dead') {
        ctx.fillStyle = "white";
        ctx.font = '20px "Tiny5", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(multiplayer.username, screenX + player.width / 2, screenY - 10);
    }
}

let hudRotation = 0;
let hudRotationTarget = 0;

function drawHUD() {
    if (!hudAssets.isLoaded) return;

    // --- 0. DIBUJAR CAPA OVERLAY (CUTS) HACIENDO 'OBJECT-FIT: COVER' ---
    if (hudAssets.cuts.complete && hudAssets.cuts.naturalWidth > 0) {
        const cRatio = canvas.width / canvas.height;
        const iRatio = hudAssets.cuts.naturalWidth / hudAssets.cuts.naturalHeight;
        let dW = canvas.width;
        let dH = canvas.height;
        let dX = 0;
        let dY = 0;

        if (cRatio > iRatio) {
            dH = canvas.width / iRatio;
            dY = (canvas.height - dH) / 2;
        } else {
            dW = canvas.height * iRatio;
            dX = (canvas.width - dW) / 2;
        }

        ctx.save();
        ctx.globalAlpha = 0.5; // 50% de opacidad solicitada
        ctx.drawImage(hudAssets.cuts, dX, dY, dW, dH);
        ctx.restore();
    }

    // --- LÓGICA DE TIEMPO Y CICLO (Abajo Derecha) ---
    const DAY_MILLIS = 20 * 60 * 1000;
    const NIGHT_MILLIS = 15 * 60 * 1000;
    const TOTAL_MILLIS = DAY_MILLIS + NIGHT_MILLIS;

    const nowMs = (Date.now() + (debugTimeOffsetMinutes * 60000)) % TOTAL_MILLIS;
    const isActuallyNight = nowMs >= DAY_MILLIS;

    // Actualizar worldTime globalmente basado en el ciclo real (afecta shaders)
    if (!isActuallyNight) {
        worldTime = 6 + (nowMs / DAY_MILLIS) * 12; // Dia: 6:00 a 18:00
    } else {
        let prog = (nowMs - DAY_MILLIS) / NIGHT_MILLIS;
        let wt = 18 + prog * 12;
        worldTime = wt >= 24 ? wt - 24 : wt; // Noche: 18:00 a 6:00
    }

    // Gestionar inicio de la transición
    if (isActuallyNight && uiCyclePhase === 'day') {
        uiCyclePhase = 'night';
        uiTransitionAnimTime = performance.now();
    } else if (!isActuallyNight && uiCyclePhase === 'night') {
        uiCyclePhase = 'day';
        uiTransitionAnimTime = performance.now();
    }

    const checkTransLimit = 500; // 0.5 segundos de animación rápida
    const rW = 100;
    const rH = 100;
    const rX = canvas.width - rW - 20;
    const rY = canvas.height - rH - 25;

    // Dibujar el icono correcto
    if (uiTransitionAnimTime > 0 && performance.now() - uiTransitionAnimTime < checkTransLimit) {
        let prog = (performance.now() - uiTransitionAnimTime) / checkTransLimit; // 0 to 1
        let actFrame = Math.floor(prog * 6) + 1; // 1 to 6
        if (actFrame > 6) actFrame = 6;
        if (uiCyclePhase === 'day') actFrame = 7 - actFrame; // animación en reversa al amanecer

        const img = hudAssets['transition' + actFrame];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, rX, rY, rW, rH);
        }
    } else {
        uiTransitionAnimTime = -1; // Detiene la trans
        
        if (uiCyclePhase === 'day') {
            if (hudAssets.clock1 && hudAssets.clock1.complete && hudAssets.clock1.naturalWidth > 0) {
                ctx.drawImage(hudAssets.clock1, rX, rY, rW, rH);
            }
            if (hudAssets.clock2 && hudAssets.clock2.complete && hudAssets.clock2.naturalWidth > 0) {
                ctx.save();
                ctx.translate(rX + rW/2, rY + rH/2);
                ctx.rotate((nowMs / DAY_MILLIS) * Math.PI * 2);
                // Palo un poco más grande y ancho, desde el centro extendiéndose hacia arriba
                const handThickness = 8;
                const handLength = (rH / 2) - 4;
                ctx.drawImage(hudAssets.clock2, -handThickness/2, -handLength, handThickness, handLength);
                ctx.restore();
            }
        } else {
            if (hudAssets.eye1 && hudAssets.eye1.complete && hudAssets.eye1.naturalWidth > 0) {
                ctx.drawImage(hudAssets.eye1, rX, rY, rW, rH);
            }
            if (hudAssets.eye2 && hudAssets.eye2.complete && hudAssets.eye2.naturalWidth > 0) {
                const px = Math.sin(performance.now() / 400) * 8;
                const py = Math.cos(performance.now() / 300) * 8;
                
                // Pupila más pequeña al acercarse el Faker
                let pSize = 34; // 34x34 pixeles por defecto
                
                if (faker && faker.active) {
                    const fx = player.x - faker.x;
                    const fy = player.y - faker.y;
                    const dist = Math.hypot(fx, fy);
                    // dist max = ~1500 (pupila normal), dist min = 40 (pupila diminuta)
                    const minSize = 8;
                    const maxSizeRange = 34 - minSize;
                    const distRatio = Math.min(1, Math.max(0, dist / 1500));
                    pSize = minSize + (maxSizeRange * distRatio);
                }
                
                const cx = rX + (rW - pSize) / 2 + px;
                const cy = rY + (rH - pSize) / 2 + py;
                
                ctx.drawImage(hudAssets.eye2, cx, cy, pSize, pSize);
            }
        }
    }

    // Dibujar texto del tiempo restante
    const timeLeftMs = isActuallyNight ? (TOTAL_MILLIS - nowMs) : (DAY_MILLIS - nowMs);
    const mins = Math.floor(timeLeftMs / 60000);
    const secs = Math.floor((timeLeftMs % 60000) / 1000);
    const timeText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    ctx.fillStyle = "white";
    ctx.font = '24px "Tiny5", sans-serif';
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText(timeText, rX + rW / 2, rY - 10);
    ctx.shadowBlur = 0;

    if (zoneMessageTimer > 0 && currentZone !== '') {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, zoneMessageTimer)})`;
        ctx.font = '40px "Jacquard 12", serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        ctx.fillText(`Entrando a ${currentZone}`, canvas.width / 2, 80);
        ctx.restore();
    }

    const isNight = worldTime >= 20 || worldTime <= 6;

    // Posiciones en la parte inferior izquierda
    const barX = 45;
    const barY = canvas.height - 85; // Subida junto con el corazón
    const barW = 200;
    const barH = 30;

    // --- 1. BARRA DE VIDA (Fondo / Z-Order bajo) ---
    // Borde Exterior Oscuro (5d3350)
    ctx.fillStyle = '#5d3350';
    ctx.fillRect(barX, barY, barW, barH);

    // Borde Medio Claro (ffb58b)
    ctx.fillStyle = '#ffb58b';
    ctx.fillRect(barX + 2, barY + 2, barW - 4, barH - 4);

    // Fondo Interior
    ctx.fillStyle = '#5d3350';
    ctx.fillRect(barX + 5, barY + 5, barW - 10, barH - 10);

    // Progreso
    const progressW = (stats.health / 100) * (barW - 10);
    if (progressW > 0) {
        ctx.fillStyle = '#ad4054'; // Rojo oscuro para salud
        ctx.fillRect(barX + 5, barY + 5, progressW, barH - 10);
    }

    // --- 2. CORAZÓN (Arriba / Z-Order alto y overlapeando) ---
    const heartImg = isNight ? hudAssets.heartNight : hudAssets.heartDay;
    const heartBaseSize = 60;
    const heartX = 10; // Queda superpuesto a la barra
    const heartY = canvas.height - 95; // Sobresale por arriba de la barra y subido proporcionalmente

    ctx.save();
    // Movemos el origen al centro del corazón para escalarlo
    ctx.translate(heartX + heartBaseSize / 2, heartY + heartBaseSize / 2);

    let scale = 1;
    if (isNight) {
        // Latido rítmico solo de noche (rápido y notable)
        const beat = performance.now() * 0.005;
        scale = 1 + Math.max(0, Math.sin(beat)) * 0.15 + Math.max(0, Math.sin(beat + 0.3)) * 0.1;
    }

    ctx.scale(scale, scale);
    ctx.drawImage(heartImg, -heartBaseSize / 2, -heartBaseSize / 2, heartBaseSize, heartBaseSize);
    ctx.restore();

    // 3. (Tablón ahora en CSS)

    // Pantalla Roja de Muerte Mytopia
    if (gameState === 'dead') {
        ctx.fillStyle = 'rgba(150, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '60px "Jacquard 12", serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 10;
        ctx.fillText("¡Te han atrapado!", canvas.width / 2, canvas.height / 2);
        
        ctx.font = '30px "Tiny5", sans-serif';
        ctx.fillText("Reiniciando...", canvas.width / 2, canvas.height / 2 + 50);
        ctx.shadowBlur = 0;
    }

    // Muestra de Debug si está activo
    if (debug.active) {
        drawDebugInfo();
    }
}

function drawSinglePupil(ex, ey, pupilSize) {
    if (!hudAssets.pupil.complete) return;

    const dx = mouseX - ex;
    const dy = mouseY - ey;
    const angle = Math.atan2(dy, dx);
    const maxMove = pupilSize * 0.4; // Reducido para que no se mueva tanto
    const dist = Math.min(maxMove, Math.hypot(dx, dy) / 25); // Movimiento más corto y sutil

    const pupX = ex + Math.cos(angle) * dist;
    const pupY = ey + Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(pupX, pupY);
    // La pupila también vibra un poco de forma independiente
    ctx.rotate(Math.sin(performance.now() * 0.01) * 0.1);
    ctx.drawImage(hudAssets.pupil, -pupilSize / 2, -pupilSize / 2, pupilSize, pupilSize);
    ctx.restore();
}


function drawSingleOtherPlayer(uid) {
    const p = multiplayer.players[uid];
    const screenX = p.x - camera.x;
    const screenY = p.y - camera.y;

    if (screenX < -100 || screenX > canvas.width + 100 || screenY < -100 || screenY > canvas.height + 100) return;

    // Dibujar nombre
    ctx.fillStyle = "white";
    ctx.font = '20px "Tiny5", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(p.username || "", screenX + player.width / 2, screenY - 10);

    const animSet = getSkinAnimations(p.skin || '#ffdbac');
    const anim = animSet[p.direction];
    const frameData = anim ? anim[Math.floor(p.frame || 0)] : null;

    let jumpOffset = 0;
    let scaleX = 1; let scaleY = 1;
    let baseHeight = player.height; let baseWidth = player.width;

    if (frameData && frameData.original) {
        const aspect = frameData.original.width / frameData.original.height;
        baseWidth = baseHeight * aspect;
    }

    if (p.isMoving) {
        // Usamos tiempo global para animar un rebote fluido mientras se actualiza LERP
        const jumpProgress = (performance.now() % 500) / 500;
        const bounce = Math.abs(Math.sin(jumpProgress * Math.PI));
        jumpOffset = -bounce * 10;
        const s = (bounce - 0.5) * 0.1;
        scaleY = 1 + s; scaleX = 1 - s;
    }

    const drawW = baseWidth * scaleX;
    const drawH = baseHeight * scaleY;
    const drawX = screenX + (player.width - drawW) / 2;
    const drawY = screenY + (player.height - drawH) + jumpOffset;

    if (frameData && frameData.processed) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frameData.processed, drawX, drawY, drawW, drawH);
    } else {
        ctx.fillStyle = p.skin || '#ffdbac';
        ctx.beginPath();
        ctx.arc(screenX + player.width / 2, screenY + player.height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawFaker() {
    if (!faker.active) return;
    
    // Obtenemos los colores del monstrou usando el color de la piel del jugador
    const animSet = getFakerSkinAnimations(skinColor);
    const anim = animSet[faker.direction];
    if (!anim) return;
    const frameData = anim[Math.floor(faker.frame)];

    const screenX = faker.x - camera.x;
    const screenY = faker.y - camera.y;

    if (screenX < -100 || screenX > canvas.width + 100 || screenY < -100 || screenY > canvas.height + 100) return;

    let jumpOffset = 0;
    let scaleX = 1; let scaleY = 1;
    let baseHeight = faker.height; let baseWidth = faker.width;

    if (frameData && frameData.original) {
        const aspect = frameData.original.width / frameData.original.height;
        baseWidth = baseHeight * aspect;
    }

    if (faker.isMoving) {
        const jumpProgress = (performance.now() % 500) / 500;
        const bounce = Math.abs(Math.sin(jumpProgress * Math.PI));
        jumpOffset = -bounce * 10;
        const s = (bounce - 0.5) * 0.1;
        scaleY = 1 + s; scaleX = 1 - s;
    }

    const drawW = baseWidth * scaleX;
    const drawH = baseHeight * scaleY;
    const drawX = screenX + (faker.width - drawW) / 2;
    const drawY = screenY + (faker.height - drawH) + jumpOffset;

    if (frameData && frameData.processed) {
        ctx.save();
        // Casi invisible ("No debes de verle") excepto un rastro translúcido oscuro
        ctx.globalAlpha = 0.8; 
        ctx.imageSmoothingEnabled = false;
        
        // Draw the faker
        ctx.drawImage(frameData.processed, drawX, drawY, drawW, drawH);
        
        ctx.restore();
    }
}

function applyDayNightEffect() {
    let opacity = 0;
    if (worldTime >= 18 && worldTime <= 21) {
        opacity = ((worldTime - 18) / 3) * 0.6;
    } else if (worldTime > 21 || worldTime < 5) {
        opacity = 0.6;
    } else if (worldTime >= 5 && worldTime <= 8) {
        opacity = (1 - (worldTime - 5) / 3) * 0.6;
    }

    if (opacity > 0) {
        ctx.fillStyle = `rgba(5, 5, 40, ${opacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // --- DRAW FOG ---
        // Generar una niebla sutil que se mueva cuando la opacidad aumenta
        if (fogAssets[0].complete && fogAssets[1].complete && fogAssets[2].complete) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = opacity * 0.8; // Mayor visibilidad de noche pura
            
            const timeOffset = performance.now() * 0.02;
            
            // Capa 1
            const f1X = (timeOffset * 0.5) % (canvas.width * 2) - canvas.width;
            ctx.drawImage(fogAssets[0], f1X, 0, canvas.width*2, canvas.height);
            
            // Capa 2 inversa
            const f2X = -(timeOffset * 0.8) % (canvas.width * 2) + canvas.width;
            ctx.drawImage(fogAssets[1], f2X, -50, canvas.width*2, canvas.height + 100);
            
            ctx.restore();
        }
    }
}

function drawHouse(drawX, drawY, worldX, worldY) {
    ctx.fillStyle = '#654321'; // paredes
    ctx.fillRect(drawX + 10, drawY + 80, 108, 100);
    ctx.fillStyle = '#8B0000'; // tejado
    ctx.beginPath();
    ctx.moveTo(drawX - 10, drawY + 80);
    ctx.lineTo(drawX + 64, drawY);
    ctx.lineTo(drawX + 138, drawY + 80);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF'; // puerta
    ctx.fillRect(drawX + 44, drawY + 130, 40, 50);
    ctx.fillStyle = '#add8e6'; // ventana
    ctx.fillRect(drawX + 24, drawY + 100, 24, 24);
    ctx.fillRect(drawX + 80, drawY + 100, 24, 24);
}

function drawInsideDoor(drawX, drawY, worldX, worldY) {
    ctx.fillStyle = '#0f0514'; // un tapete oscuro
    ctx.fillRect(drawX - 32, drawY - 32, 64, 64);
}

function drawAirplane(drawX, drawY) {
    if (planeAsset && planeAsset.complete && planeAsset.naturalWidth > 0) {
        // Redimensionar mantieniendo proporciones
        let iw = 120;
        let ih = (planeAsset.naturalHeight / planeAsset.naturalWidth) * iw;
        // Ajustamos la posición para que quede estético
        ctx.drawImage(planeAsset, drawX - 10, drawY + 10, iw, ih);
    } else {
        ctx.font = "80px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🛩️", drawX + 32, drawY + 64);
    }
}

function drawInteractionPrompt() {
    if (currentActionPrompt) {
        const screenX = player.x - camera.x;
        const screenY = player.y - camera.y;

        ctx.save();
        ctx.font = '22px "Tiny5", sans-serif';
        const textWidth = ctx.measureText(currentActionPrompt).width;
        
        const boxWidth = textWidth + 16;
        const boxHeight = 30;
        
        const drawX = screenX + player.width / 2;
        const drawY = screenY - 50 - (multiplayer.username ? 20 : 0); // Ajuste de altura dinámica

        // Dibujar caja translúcida
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(drawX - boxWidth / 2, drawY - boxHeight / 2 - 6, boxWidth, boxHeight, 8);
        ctx.fill();

        // Dibujar texto
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentActionPrompt, drawX, drawY - 4);
        
        ctx.restore();
    }
}

