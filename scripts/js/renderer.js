function drawTiles() {
    ctx.imageSmoothingEnabled = false; // Asegurar píxeles nítidos en cada frame
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
            const drawX = Math.floor(tx * tileSize - camera.x);
            const drawY = Math.floor(ty * tileSize - camera.y);

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
                    const offset = (mx + my) % 3;
                    const frame = (Math.floor(performance.now() / 400) + offset) % 3 + 1;
                    finalType = 'wave' + frame;
                    const parts = tileType.split('_');
                    const dir = parts[1];
                    if (dir === 'S') rotation = 0;
                    if (dir === 'W') rotation = Math.PI * 0.5;
                    if (dir === 'N') rotation = Math.PI;
                    if (dir === 'E') rotation = Math.PI * 1.5;
                } else if (tileType.startsWith('wave4')) {
                    finalType = 'wave4';
                    const dir = tileType.split('_')[1];
                    if (dir === 'BR') rotation = 0;
                    if (dir === 'BL') rotation = Math.PI * 0.5;
                    if (dir === 'TL') rotation = Math.PI;
                    if (dir === 'TR') rotation = Math.PI * 1.5;
                } else if (tileType === 'water') {
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

                    const isWaterTile = tileType === 'water' || tileType.includes('wave');
                    if (isWaterTile && tileAssets.wavebig && tileAssets.wavebig.complete) {
                        const waveTime = performance.now() * 0.0012;
                        const posOffset = (mx * 0.8 + my * 1.5);
                        const cycle = waveTime + posOffset;
                        const sinVal = Math.sin(cycle);
                        const alpha = (sinVal + 1) / 2 * 0.6;
                        
                        if (alpha > 0.02) {
                            ctx.save();
                            ctx.beginPath();
                            if (tileType === 'water') {
                                ctx.rect(drawX, drawY, tileSize, tileSize);
                            } else if (tileType.startsWith('wave_')) {
                                const dir = tileType.split('_')[1];
                                if (dir === 'S') ctx.rect(drawX, drawY + tileSize/2, tileSize, tileSize/2);
                                else if (dir === 'N') ctx.rect(drawX, drawY, tileSize, tileSize/2);
                                else if (dir === 'W') ctx.rect(drawX, drawY, tileSize/2, tileSize);
                                else if (dir === 'E') ctx.rect(drawX + tileSize/2, drawY, tileSize/2, tileSize);
                                else ctx.rect(drawX, drawY, tileSize, tileSize);
                            } else {
                                ctx.rect(drawX, drawY, tileSize, tileSize);
                            }
                            ctx.clip();
                            ctx.globalAlpha = alpha;
                            const shiftX = Math.cos(cycle * 0.7) * 15;
                            const shiftY = Math.sin(cycle * 0.4) * 4;
                            const progress = (sinVal + 1) / 2;
                            const squash = 0.2 + 0.8 * progress;
                            ctx.translate(drawX + tileSize / 2 + shiftX, drawY + tileSize / 2 + shiftY);
                            ctx.scale(1.2, squash);
                            ctx.drawImage(tileAssets.wavebig, -tileSize / 2, -tileSize / 2, tileSize, tileSize);
                            ctx.restore();
                        }
                    }
                } else {
                    if (tileType === 'black') {
                        ctx.fillStyle = '#111';
                        ctx.fillRect(drawX, drawY, tileSize, tileSize);
                    } else if (tileType === 'woodFloor') {
                        if (floorTileAsset.complete && floorTileAsset.naturalWidth > 0) {
                            ctx.drawImage(floorTileAsset, drawX, drawY, tileSize, tileSize);
                        } else {
                            ctx.fillStyle = '#654321';
                            ctx.fillRect(drawX, drawY, tileSize, tileSize);
                        }
                    } else {
                        ctx.fillStyle = tileType.includes('grass') ? '#2d5a27' : ((tileType.includes('water') || tileType.includes('wave')) ? '#0f5e9c' : '#d2b48c');
                        ctx.fillRect(drawX, drawY, tileSize, tileSize);
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

let palmtreeShadowCanvas = null;
function drawPalmtreeShadows() {
    if (!tileAssets.isLoaded || !palmtreeAsset.complete || palmtreeAsset.naturalWidth === 0) return;
    const tileSize = 64;
    if (!palmtreeShadowCanvas) {
        palmtreeShadowCanvas = document.createElement('canvas');
        palmtreeShadowCanvas.width = palmtreeAsset.naturalWidth;
        palmtreeShadowCanvas.height = palmtreeAsset.naturalHeight;
        const sCtx = palmtreeShadowCanvas.getContext('2d');
        sCtx.drawImage(palmtreeAsset, 0, 0);
        sCtx.globalCompositeOperation = 'source-in';
        sCtx.fillStyle = '#0f0514';
        sCtx.fillRect(0, 0, palmtreeShadowCanvas.width, palmtreeShadowCanvas.height);
    }
    const sun = getSunlightTransform();
    ctx.save();
    ctx.globalAlpha = sun.alpha;
    palmtreeData.forEach(tree => {
        const drawX = tree.x * tileSize - camera.x;
        const drawY = tree.y * tileSize - camera.y;
        if (drawX > -400 && drawX < canvas.width + 400 && drawY > -400 && drawY < canvas.height + 400) {
            const dw = palmtreeAsset.naturalWidth * PIXEL_SCALE;
            const dh = palmtreeAsset.naturalHeight * PIXEL_SCALE;
            const baseX = drawX + palmtreeHitbox.xRel;
            const baseY = drawY + palmtreeHitbox.yRel + palmtreeHitbox.h / 2 - 10;
            ctx.save();
            ctx.translate(baseX, baseY);
            ctx.transform(1, 0, sun.skewAmount, sun.scaleAmount, 0, 0);
            const imgLeft = (drawX - (dw - tileSize) / 2) - baseX;
            const imgTop = (drawY - (dh - tileSize)) - baseY;
            ctx.drawImage(palmtreeShadowCanvas, imgLeft, imgTop, dw, dh);
            ctx.restore();
        }
    });
    ctx.restore();
}

function drawHouseShadow() {
    if (!islandFeatures.house || !houseAsset.complete || houseAsset.naturalWidth === 0) return;
    const hx = islandFeatures.house.x * 64 - camera.x;
    const hy = islandFeatures.house.y * 64 - camera.y;
    const sun = getSunlightTransform();
    ctx.save();
    ctx.globalAlpha = sun.alpha;
    const targetW = houseAsset.naturalWidth * 3.5;
    const baseX = hx + 64; 
    const baseY = hy + 75;
    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.transform(1, 0, sun.skewAmount, sun.scaleAmount, 0, 0);
    ctx.fillStyle = 'rgba(15, 5, 20, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, targetW * 0.45, 30 * sun.scaleAmount, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
}

function drawPlayerShadows() {
    const sun = getSunlightTransform();
    const shadowColor = '#0f0514';
    const entities = [{ ...player, isLocal: true, screenX: player.x - camera.x, screenY: player.y - camera.y, u_uid: 'local' }];
    for (let uid in multiplayer.players) {
        const p = multiplayer.players[uid];
        entities.push({ ...p, isLocal: false, screenX: p.x - camera.x, screenY: p.y - camera.y, width: 64, height: 64, direction: p.direction || 'forward', u_uid: uid });
    }
    if (faker && faker.active) {
        entities.push({ ...faker, isLocal: false, screenX: faker.x - camera.x, screenY: faker.y - camera.y, u_uid: 'faker' });
    }
    ctx.save();
    ctx.globalAlpha = sun.alpha;
    entities.forEach(ent => {
        if (ent.screenX < -100 || ent.screenX > canvas.width + 100 || ent.screenY < -100 || ent.screenY > canvas.height + 100) return;
        let frameData = null;
        if (ent.u_uid === 'faker') {
            if (faker.spawnState === 'enter1') frameData = { processed: faker.enterAssets.enter1Processed || faker.enterAssets.enter1 };
            else if (faker.spawnState === 'enter2') frameData = { processed: faker.enterAssets.enter2Processed || faker.enterAssets.enter2 };
            else if (faker.spawnState === 'enter3') frameData = { processed: faker.enterAssets.enter3Processed || faker.enterAssets.enter3 };
            else {
                const anim = faker.animations[ent.direction];
                frameData = anim ? anim[Math.floor(ent.frame || 0)] : null;
            }
        } else {
            const anim = player.animations[ent.direction];
            frameData = anim ? anim[Math.floor(ent.frame || 0)] : null;
        }
        let scaleX = 1, scaleY = 1, baseHeight = ent.height, baseWidth = ent.width, jumpOffset = 0;
        if (frameData && frameData.original) {
            const aspect = frameData.original.width / frameData.original.height;
            baseWidth = baseHeight * aspect;
        }
        if (ent.isMoving) {
            const jumpProgress = (performance.now() % 500) / 500;
            const bounce = Math.abs(Math.sin(jumpProgress * Math.PI));
            jumpOffset = -bounce * 10;
            const s = (bounce - 0.5) * 0.1;
            scaleY = 1 + s; scaleX = 1 - s;
        }
        const drawW = baseWidth * scaleX;
        const drawH = baseHeight * scaleY;
        const drawX = ent.screenX + (ent.width - drawW) / 2;
        const drawY = ent.screenY + (ent.height - drawH) + jumpOffset;
        if (frameData && frameData.processed) {
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
    if (drawX > -tileSize * 4 && drawX < canvas.width + tileSize * 4 && drawY > -tileSize * 6 && drawY < canvas.height + tileSize * 4) {
        const treeW = treeAsset.naturalWidth * PIXEL_SCALE;
        const treeH = treeAsset.naturalHeight * PIXEL_SCALE;
        ctx.drawImage(treeAsset, Math.floor(drawX - (treeW - tileSize) / 2), Math.floor(drawY - (treeH - tileSize)), treeW, treeH);
    }
}

function drawSinglePalmtree(tree, tileSize) {
    if (!palmtreeAsset.complete) return;
    const screenX = tree.x * tileSize - camera.x;
    const screenY = tree.y * tileSize - camera.y;
    if (screenX < -512 || screenX > canvas.width + 512 || screenY < -512 || screenY > canvas.height + 512) return;
    const drawW = palmtreeAsset.naturalWidth * PIXEL_SCALE;
    const drawH = palmtreeAsset.naturalHeight * PIXEL_SCALE;
    ctx.drawImage(palmtreeAsset, Math.floor(screenX - (drawW - tileSize) / 2), Math.floor(screenY - (drawH - tileSize)), drawW, drawH);
}

function drawPlayer() {
    const animSet = getSkinAnimations(skinColor);
    const anim = animSet[player.direction];
    const frameData = anim ? anim[Math.floor(player.frame)] : null;
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;
    let jumpOffset = 0, scaleX = 1, scaleY = 1, baseHeight = 64, baseWidth = 64;
    if (frameData && frameData.original) {
        const aspect = frameData.original.width / frameData.original.height;
        baseWidth = baseHeight * aspect;
    }
    if (player.emote && player.emote.active) {
        // En emote no aplicamos rebote ni respiración para no deformar el pixel art
        scaleX = 1; scaleY = 1; jumpOffset = 0;
    } else if (player.isMoving) {
        const cycleProgress = (player.frame + (player.frameTimer / player.frameDuration)) / 6;
        const bounce = Math.abs(Math.sin(cycleProgress * Math.PI * 2));
        jumpOffset = -bounce * 10;
        // Mantenemos una ligera escala en movimiento si quieres, o la quitamos. 
        // El usuario pide no aplastar, así que la reseteamos a 1.
        scaleY = 1; scaleX = 1;
    } else {
        const breath = Math.sin((player.idleTime || 0) * 3);
        scaleY = 1 + breath * 0.02;
        scaleX = 1 - breath * 0.01;
    }
    const drawW = baseWidth * scaleX;
    const drawH = baseHeight * scaleY;
    const drawX = screenX + (player.width - drawW) / 2;
    const drawY = screenY + (player.height - drawH) + jumpOffset;

    if (player.emote && player.emote.active && player.emote.frames[player.emote.frame]) {
        const eFrame = player.emote.frames[player.emote.frame];
        
        // El jugador se dibuja a 64px de alto. Para que el pixel-size sea el mismo,
        // necesitamos saber a qué escala se está dibujando ese sprite de 64px.
        const walkAnim = player.animations.forward[0];
        const charOrigH = (walkAnim && walkAnim.original) ? walkAnim.original.height : 18;
        // Esta es la escala real: de los píxeles originales a los 64px de pantalla
        const currentScale = 64 / charOrigH;

        // Aplicamos ESA MISMA escala a los frames del emote
        const eW = eFrame.width * currentScale;
        const eH = eFrame.height * currentScale;
        
        const drawEX = screenX + (player.width - eW) / 2;
        let drawEY = screenY + (player.height - eH);
        
        // Secuencia de saltitos sincronizada (3 frames: 31-33)
        const frameNum = player.emote.frame + 1;
        if (frameNum === 31) {
            drawEY -= 15;
        } else if (frameNum === 32) {
            drawEY -= 10;
        } else if (frameNum === 33) {
            drawEY -= 5;
        }
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(eFrame, drawEX, drawEY, eW, eH);
    } else if (gameState === 'dead' && frameData && (frameData.processed || frameData.original)) {
        ctx.save();
        ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
        ctx.rotate(Math.PI / 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frameData.processed || frameData.original, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    } else if (frameData && (frameData.processed || frameData.original)) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frameData.processed || frameData.original, drawX, drawY, drawW, drawH);
    } else {
        ctx.fillStyle = skinColor || '#ffdbac';
        ctx.beginPath();
        ctx.arc(screenX + 32, screenY + 32, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.fillRect(screenX + 22, screenY + 25, 4, 4);
        ctx.fillRect(screenX + 38, screenY + 25, 4, 4);
    }
    if (multiplayer.username && gameState !== 'dead') {
        ctx.save();
        ctx.font = '20px "Tiny5", sans-serif';
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.8)";
        ctx.lineWidth = 3;
        ctx.strokeText(multiplayer.username, screenX + player.width / 2, screenY - 10);
        ctx.fillStyle = "white";
        ctx.fillText(multiplayer.username, screenX + player.width / 2, screenY - 10);
        ctx.restore();
    }
}

function drawHUD() {
    if (!hudAssets.isLoaded) return;
    if (hudAssets.cuts.complete && hudAssets.cuts.naturalWidth > 0) {
        const cRatio = canvas.width / canvas.height, iRatio = hudAssets.cuts.naturalWidth / hudAssets.cuts.naturalHeight;
        let dW = canvas.width, dH = canvas.height, dX = 0, dY = 0;
        if (cRatio > iRatio) { dH = canvas.width / iRatio; dY = (canvas.height - dH) / 2; }
        else { dW = canvas.height * iRatio; dX = (canvas.width - dW) / 2; }
        ctx.save(); ctx.globalAlpha = 0.5; ctx.drawImage(hudAssets.cuts, dX, dY, dW, dH); ctx.restore();
    }
    const DAY_MILLIS = 20 * 60 * 1000, NIGHT_MILLIS = 15 * 60 * 1000, TOTAL_MILLIS = DAY_MILLIS + NIGHT_MILLIS;
    const nowMs = (Date.now() + (debugTimeOffsetMinutes * 60000)) % TOTAL_MILLIS;
    const isActuallyNight = nowMs >= DAY_MILLIS;
    if (!isActuallyNight) worldTime = 6 + (nowMs / DAY_MILLIS) * 12;
    else { let prog = (nowMs - DAY_MILLIS) / NIGHT_MILLIS; let wt = 18 + prog * 12; worldTime = wt >= 24 ? wt - 24 : wt; }
    if (isActuallyNight && uiCyclePhase === 'day') { uiCyclePhase = 'night'; uiTransitionAnimTime = performance.now(); }
    else if (!isActuallyNight && uiCyclePhase === 'night') { uiCyclePhase = 'day'; uiTransitionAnimTime = performance.now(); }
    const rW = 100, rH = 100, rX = canvas.width - rW - 20, rY = canvas.height - rH - 25;
    if (uiTransitionAnimTime > 0 && performance.now() - uiTransitionAnimTime < 2000) {
        let prog = (performance.now() - uiTransitionAnimTime) / 2000;
        let actFrame = Math.floor(prog * 6) + 1;
        if (actFrame > 6) actFrame = 6;
        if (uiCyclePhase === 'day') actFrame = 7 - actFrame;
        const img = hudAssets['transition' + actFrame];
        if (img && img.complete) ctx.drawImage(img, rX, rY, rW, rH);
    } else {
        uiTransitionAnimTime = -1;
        if (uiCyclePhase === 'day') {
            if (hudAssets.clock1.complete) ctx.drawImage(hudAssets.clock1, rX, rY, rW, rH);
            if (hudAssets.clock2.complete) {
                ctx.save(); ctx.translate(rX + rW/2, rY + rH/2); ctx.rotate((nowMs / DAY_MILLIS) * Math.PI * 2);
                ctx.drawImage(hudAssets.clock2, -4, -(rH/2)+4, 8, (rH/2)-4); ctx.restore();
            }
        } else {
            if (hudAssets.eye1.complete) ctx.drawImage(hudAssets.eye1, rX, rY, rW, rH);
            if (hudAssets.eye2.complete) {
                const px = Math.sin(performance.now() / 400) * 8, py = Math.cos(performance.now() / 300) * 8;
                let pSize = 34;
                if (faker && faker.active) pSize = 6 + (28 * (1 - faker.strength));
                ctx.drawImage(hudAssets.eye2, rX + (rW-pSize)/2 + px, rY + (rH-pSize)/2 + py, pSize, pSize);
            }
        }
    }
    const timeLeftMs = isActuallyNight ? (TOTAL_MILLIS - nowMs) : (DAY_MILLIS - nowMs);
    const mins = Math.floor(timeLeftMs / 60000), secs = Math.floor((timeLeftMs % 60000) / 1000);
    ctx.fillStyle = "white"; ctx.font = '24px "Tiny5", sans-serif'; ctx.textAlign = "center";
    ctx.shadowColor = "black"; ctx.shadowBlur = 4; ctx.fillText(`${mins}:${secs < 10 ? '0' : ''}${secs}`, rX + rW/2, rY - 10); ctx.shadowBlur = 0;
    if (zoneMessageTimer > 0 && currentZone !== '') {
        ctx.save(); ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, zoneMessageTimer)})`;
        ctx.font = '40px "Jacquard 12", serif'; ctx.textAlign = 'center'; ctx.fillText(`Entrando a ${currentZone}`, canvas.width / 2, 80); ctx.restore();
    }
    const isNight = worldTime >= 20 || worldTime <= 6;
    const barX = 45, barY = canvas.height - 110, barW = 200, barH = 30;
    ctx.fillStyle = '#5d3350'; ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#ffb58b'; ctx.fillRect(barX + 2, barY + 2, barW - 4, barH - 4);
    ctx.fillStyle = '#5d3350'; ctx.fillRect(barX + 5, barY + 5, barW - 10, barH - 10);
    const progressW = (stats.health / 100) * (barW - 10);
    if (progressW > 0) { ctx.fillStyle = '#ad4054'; ctx.fillRect(barX + 5, barY + 5, progressW, barH - 10); }
    const heartImg = isNight ? hudAssets.heartNight : hudAssets.heartDay, heartSize = 60, heartX = 10, heartY = canvas.height - 140;
    ctx.save(); ctx.translate(heartX + heartSize/2, heartY + heartSize/2);
    let scale = 1; if (isNight) {
        const fakerBoost = (faker && faker.active) ? faker.strength : 0;
        const beat = performance.now() * (0.005 + fakerBoost * 0.01);
        scale = 1 + Math.max(0, Math.sin(beat)) * (0.15 + fakerBoost * 0.2);
    }
    ctx.scale(scale, scale); ctx.drawImage(heartImg, -heartSize/2, -heartSize/2, heartSize, heartSize); ctx.restore();
    if (gameState === 'dead') {
        ctx.fillStyle = 'rgba(150, 0, 0, 0.4)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff'; ctx.font = '60px "Jacquard 12", serif'; ctx.textAlign = 'center';
        ctx.fillText("¡Te han atrapado!", canvas.width / 2, canvas.height / 2);
    }
    if (debug.active) drawDebugInfo();
}

function drawSinglePupil(ex, ey, pSize) {
    if (!hudAssets.pupil.complete) return;
    const dx = mouseX - ex, dy = mouseY - ey, angle = Math.atan2(dy, dx), dist = Math.min(pSize * 0.4, Math.hypot(dx, dy) / 25);
    ctx.save(); ctx.translate(ex + Math.cos(angle) * dist, ey + Math.sin(angle) * dist);
    ctx.drawImage(hudAssets.pupil, -pSize/2, -pSize/2, pSize, pSize); ctx.restore();
}

function drawSingleOtherPlayer(uid) {
    const p = multiplayer.players[uid];
    const sx = p.x - camera.x, sy = p.y - camera.y;
    if (sx < -100 || sx > canvas.width + 100 || sy < -100 || sy > canvas.height + 100) return;
    ctx.save(); ctx.font = '20px "Tiny5", sans-serif'; ctx.textAlign = "center"; ctx.fillStyle = "white"; ctx.fillText(p.username || "", sx + 32, sy - 10); ctx.restore();
    
    // Si el otro jugador está haciendo un emote
    if (p.emoteActive) {
        const skinAnims = getSkinAnimations(p.skin || '#ffdbac');
        // Obtener emote frames del cache de skins
        const cached = skinCaches[p.skin || '#ffdbac'];
        const emoteF = cached && cached.emotes && cached.emotes[1] ? cached.emotes[1] : null;
        
        // Sincronización absoluta con el audio que oímos de él
        let frameIdx = p.emoteFrame || 0;
        if (p.activeAudio && !p.activeAudio.paused) {
            frameIdx = Math.floor(p.activeAudio.currentTime / 0.1);
        }
        
        if (emoteF && emoteF[frameIdx]) {
            const eFrame = emoteF[frameIdx];
            const walkAnim = player.animations.forward[0];
            const charOrigH = (walkAnim && walkAnim.original) ? walkAnim.original.height : 18;
            const currentScale = 64 / charOrigH;
            const eW = eFrame.width * currentScale;
            const eH = eFrame.height * currentScale;
            const drawEX = sx + (64 - eW) / 2;
            let drawEY = sy + (64 - eH);
            
            // Saltitos sincronizados (3 frames: 31-33)
            const frameNum = frameIdx + 1;
            if (frameNum === 31) drawEY -= 15;
            else if (frameNum === 32) drawEY -= 10;
            else if (frameNum === 33) drawEY -= 5;
            
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(eFrame, drawEX, drawEY, eW, eH);
            return;
        }
    }
    
    const anim = getSkinAnimations(p.skin || '#ffdbac')[p.direction];
    const frame = anim ? anim[Math.floor(p.frame || 0)] : null;
    if (frame && (frame.processed || frame.original)) {
        ctx.imageSmoothingEnabled = false;
        const img = frame.processed || frame.original;
        const orig = frame.original;
        
        let dw = 64;
        let dh = 64;
        if (orig) {
            const aspect = orig.width / orig.height;
            dw = 64 * aspect;
        }
        
        ctx.drawImage(img, sx + (64 - dw) / 2, sy, dw, dh);
    }
}

function drawFaker() {
    if (!faker.active || faker.spawnState === 'hidden') return;
    const sx = faker.x - camera.x;
    let sy = faker.y - camera.y;
    if (sx < -200 || sx > canvas.width + 200 || sy < -200 || sy > canvas.height + 200) return;
    let img = null;
    if (faker.spawnState.startsWith('enter')) img = faker.enterAssets[faker.spawnState + 'Processed'] || faker.enterAssets[faker.spawnState];
    else { const anim = getFakerSkinAnimations(skinColor)[faker.direction]; if (anim) img = anim[Math.floor(faker.frame)].processed || anim[Math.floor(faker.frame)].original; }
    
    // Salto grande en la fase enter2 (0.5s)
    if (faker.spawnState === 'enter2') {
        const jumpProgress = faker.spawnTimer / 0.5; // 0 al inicio, 1 al final del timer
        const jumpArc = Math.sin(jumpProgress * Math.PI); // parábola suave
        sy -= jumpArc * 80; // Salto de 80px de alto
    }
    
    if (img) {
        ctx.imageSmoothingEnabled = false;
        const isCanvas = img instanceof HTMLCanvasElement;
        const imgW = isCanvas ? img.width : (img.naturalWidth || 64);
        const imgH = isCanvas ? img.height : (img.naturalHeight || 64);
        let dh = 64;
        let dw = (imgH > 0) ? (imgW / imgH) * 64 : 64;
        ctx.drawImage(img, sx + (64 - dw)/2, sy + (64 - dh), dw, dh);
    }
}

function applyDayNightEffect() {
    let opacity = 0;
    
    // Si hay una transición de 2s activa en el HUD, usamos esa para la iluminación
    if (uiTransitionAnimTime > 0 && performance.now() - uiTransitionAnimTime < 2000) {
        let prog = (performance.now() - uiTransitionAnimTime) / 2000;
        if (uiCyclePhase === 'night') {
            opacity = prog * 0.6; // Anocheciendo
        } else {
            opacity = (1 - prog) * 0.6; // Amaneciendo
        }
    } else {
        // Lógica normal basada en worldTime
        if (worldTime >= 18 && worldTime <= 21) opacity = ((worldTime - 18) / 3) * 0.6;
        else if (worldTime > 21 || worldTime < 5) opacity = 0.6;
        else if (worldTime >= 5 && worldTime <= 8) opacity = (1 - (worldTime - 5) / 3) * 0.6;
    }

    if (opacity > 0) {
        ctx.fillStyle = `rgba(5, 5, 40, ${opacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawHouse(dx, dy) {
    if (houseAsset.complete) {
        ctx.imageSmoothingEnabled = false;
        const tw = houseAsset.naturalWidth * 4, th = houseAsset.naturalHeight * 4;
        const finalX = Math.floor(dx - (tw - 128) / 2);
        const finalY = Math.floor(dy + 80 - th);
        ctx.drawImage(houseAsset, finalX, finalY, tw, th);
        if (houseColor !== 'none') {
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = houseColor;
            ctx.fillRect(finalX, finalY, tw, th);
            ctx.restore();
        }
    }
}

function drawDock(dx, dy) { if (dockAsset.complete) ctx.drawImage(dockAsset, dx, dy, dockAsset.naturalWidth*PIXEL_SCALE, dockAsset.naturalHeight*PIXEL_SCALE); }
function drawInsideDoor(dx, dy) { ctx.fillStyle = '#0f0514'; ctx.fillRect(dx-32, dy-32, 64, 64); }
function drawAirplane(dx, dy) {
    let ox = 0, oy = 0, ang = 0;
    if (gameState === 'traveling') {
        const tt = 8, lst = TRAVEL_TIME - tt;
        if (travelTimer <= tt) { const t = travelTimer/tt; ox = t*600; oy = -(t*t*800); ang = -Math.PI/12; }
        else if (travelTimer >= lst) { const t = (TRAVEL_TIME-travelTimer)/tt; ox = -t*600; oy = -(t*t*800); ang = Math.PI/12; }
        else return;
    } else if (gameState === 'playing' && !currentIsland.includes('_inside')) oy = Math.sin(Date.now()*0.003)*6;
    if (planeAsset.complete) {
        const iw = planeAsset.naturalWidth*PIXEL_SCALE, ih = planeAsset.naturalHeight*PIXEL_SCALE;
        ctx.save(); ctx.translate(dx+ox+iw/2, dy+oy+ih/2); ctx.rotate(ang); ctx.drawImage(planeAsset, -iw/2, -ih/2, iw, ih); ctx.restore();
    }
}

function drawSign(x,y) { if (signAsset.complete) ctx.drawImage(signAsset, x, y, 64, 64); }
function drawInteractionPrompt() {
    if (currentActionPrompt) {
        const sx = player.x-camera.x, sy = player.y-camera.y;
        ctx.save(); ctx.font = '22px "Tiny5", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'white'; ctx.fillText(currentActionPrompt, sx+32, sy-50); ctx.restore();
    }
}

function getTintedFurniture(t,c) {
    const k = `${t}_${c}`; if (furnitureCaches[k]) return furnitureCaches[k];
    const b = furnitureAssets[t]; if (!b || !b.complete) return null;
    const tc = document.createElement('canvas'); tc.width = b.naturalWidth; tc.height = b.naturalHeight;
    const tx = tc.getContext('2d'); tx.drawImage(b,0,0);
    const target = hexToRgb(c || '#ffffff'); if (!target) return b;
    const id = tx.getImageData(0,0,tc.width,tc.height), d = id.data;
    for (let i=0; i<d.length; i+=4) { if (d[i+3]>0 && d[i+1]>d[i] && d[i+1]>d[i+2]) { const f=d[i+1]/255; d[i]=target.r*f; d[i+1]=target.g*f; d[i+2]=target.b*f; } }
    tx.putImageData(id,0,0); furnitureCaches[k] = tc; return tc;
}

function drawFurnitureSingle(f) {
    const dx = f.x-camera.x, dy = f.y-camera.y;
    ctx.save();
    if (f.type === 'sofa') {
        const img = getTintedFurniture('sofa', f.color);
        if (img) ctx.drawImage(img, dx-96, dy-32, 192, 64);
    } else if (f.type === 'table') { ctx.fillStyle = '#8b4513'; ctx.fillRect(dx-32, dy-10, 64, 15); }
    if (selectedFurniture === f || editingFurniture === f) { ctx.lineWidth = 4; ctx.strokeStyle = (selectedFurniture===f)?'#fff':'#ffcc00'; ctx.strokeRect(dx-35, dy-35, 70, 70); }
    ctx.restore();
}

function applyChromaticAberration() {
    if (!faker.active || faker.spawnState === 'hidden') {
        canvas.style.filter = 'none';
        canvas.style.transform = 'none';
        return;
    }
    const i = faker.strength || 0; 
    if (i > 0) {
        // Efecto glitch sutil pero inquietante
        const s = i * 20; 
        const jx = (Math.random() - 0.5) * i * 12; 
        const jy = (Math.random() - 0.5) * i * 8; 
        const sj = 1 + (Math.random() - 0.5) * i * 0.08;
        const sk = (Math.random() - 0.5) * i * 3; 
        
        canvas.style.transform = `translate(${jx}px, ${jy}px) scale(${sj}) skew(${sk}deg)`;
        canvas.style.filter = `drop-shadow(${s}px 0px 0px rgba(255,0,0,${i*0.5})) drop-shadow(${-s}px 0px 0px rgba(0,255,255,${i*0.5})) saturate(${100+i*150}%) contrast(${100+i*80}%) brightness(${100-i*20}%)`;
    } else {
        canvas.style.filter = 'none';
        canvas.style.transform = 'none';
    }
}

function drawMinimap() {
    if (!minimapCtx || !mapData.length) return;
    const m = mapSize, tw = minimapCanvas.width/m, th = minimapCanvas.height/m;
    for (let y=0; y<m; y++) {
        for (let x=0; x<m; x++) {
            const t = mapData[y][x];
            minimapCtx.fillStyle = (t==='water'||t.includes('wave'))?'#0f5e9c':(t.includes('grass')?'#2d5a27':(t.includes('sand')?'#d2b48c':(t.includes('brik')?'#555':(t==='woodFloor'?'#654321':'#111'))));
            minimapCtx.fillRect(x*tw, y*th, tw+0.1, th+0.1);
        }
    }
    for (let uid in multiplayer.players) { const p = multiplayer.players[uid]; drawMinimapArrow(p.x, p.y, p.direction, p.skin||'#ffdbac', false); }
    const angle = (player.vx!==0||player.vy!==0)?Math.atan2(player.vy, player.vx):directionToAngle(player.direction);
    drawMinimapPoint(player.x, player.y, angle, '#ffffff', true);
    if (planeX!==0) { minimapCtx.font="12px Arial"; minimapCtx.textAlign="center"; minimapCtx.fillText("✈️", (planeX*64)/(m*64)*minimapCanvas.width, (planeY*64)/(m*64)*minimapCanvas.height); }
    if (faker && faker.active) drawMinimapArrow(faker.x, faker.y, faker.direction, '#ff0000', false);
}

function directionToAngle(d) { const m = {'forward':Math.PI/2,'up':-Math.PI/2,'left':Math.PI,'right':0}; return m[d]||0; }
function drawMinimapPoint(wx, wy, a, c, l) {
    const mx=(wx/(mapSize*64))*minimapCanvas.width, my=(wy/(mapSize*64))*minimapCanvas.height;
    minimapCtx.save(); minimapCtx.translate(mx, my); minimapCtx.rotate(a); minimapCtx.fillStyle=c;
    minimapCtx.beginPath(); minimapCtx.moveTo(6,0); minimapCtx.lineTo(-4,-4); minimapCtx.lineTo(-4,4); minimapCtx.closePath(); minimapCtx.fill(); minimapCtx.restore();
}
function drawMinimapArrow(wx, wy, d, c, l) { drawMinimapPoint(wx, wy, directionToAngle(d), c, l); }

function drawHouseWallPhoto() {
    if (!currentIsland.includes('_inside') || !houseWallPhotoImage) return;
    const px = (mapSize/2)*64, py = (mapSize/2-5)*64, hw = 11*64, dx = px-(hw/2)-camera.x, wh = 660, dy = py-wh-camera.y;
    ctx.fillStyle = '#111'; ctx.fillRect(dx, dy, hw, wh);
    if (houseWallPhotoImage && (houseWallPhotoImage.complete || houseWallPhotoImage instanceof HTMLCanvasElement)) {
        ctx.imageSmoothingEnabled = false; ctx.drawImage(houseWallPhotoImage, dx, dy, hw, wh);
    }
}


